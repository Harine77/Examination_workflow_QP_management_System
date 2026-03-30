const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const NLPService = require('../services/nlpService');
const QuestionPaper = require('../models/QuestionPaper');
const Question = require('../models/Question');
const { protect, canCreate, canEdit, canFinalize } = require('../middleware/authMiddleware');

// Thin pg pool for question_reviews (not a Sequelize model)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'exam_workflow',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.DB_PASS || 'password',
});

// All routes require authentication
router.use(protect);

// Analyze question and return CO/KL mapping (All authenticated users)
router.post('/analyze', async (req, res) => {
  try {
    const { questionText, courseId } = req.body;
    
    // Validation
    if (!questionText || !questionText.trim()) {
      return res.status(400).json({ 
        success: false,
        error: 'Question text is required' 
      });
    }
    
    if (!courseId) {
      return res.status(400).json({ 
        success: false,
        error: 'Course ID is required' 
      });
    }
    
    // Analyze question
    const result = await NLPService.analyzeQuestion(questionText, courseId);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error analyzing question:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to analyze question',
      message: error.message 
    });
  }
});

// Create question paper (Faculty only)
router.post('/paper', canCreate, async (req, res) => {
  try {
    const { courseId, examType, catNumber, examDate } = req.body;
    
    const questionPaper = await QuestionPaper.create({
      CourseId: courseId,
      examType,
      catNumber,
      examDate,
      status: 'draft',
      createdBy: req.user.id  // Track who created it
    });
    
    res.status(201).json({
      success: true,
      message: 'Question paper created successfully',
      data: questionPaper
    });
    
  } catch (error) {
    console.error('Error creating question paper:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create question paper',
      message: error.message
    });
  }
});

// Get all question papers — filtered by the caller's role and workflow stage
router.get('/papers', async (req, res) => {
  try {
    const { status } = req.query;
    const User = require('../models/user');
    const Course = require('../models/Course');
    const { Op } = require('sequelize');
    
    let whereClause = {};
    
    // Explicit status filter from query param takes precedence
    if (status) {
      whereClause.status = status;
    } else {
      // Default: show only the papers relevant to each role
      switch (req.user.role) {
        case 'faculty':
          // Faculty sees their own papers at all stages
          whereClause.createdBy = req.user.id;
          break;
        case 'scrutinizer_1':
          whereClause.status = 'with_scrutinizer1';
          break;
        case 'scrutinizer_2':
          whereClause.status = { [Op.in]: ['with_scrutinizer2', 'scrutinizer2_approved'] };
          break;
        case 'panel_member':
          whereClause.status = { [Op.in]: ['with_panel', 'randomized'] };
          break;
        case 'hod':
          whereClause.status = { [Op.in]: ['with_hod', 'hod_approved'] };
          break;
        // Generic scrutinizer — can see both scrutinizer queues
        case 'scrutinizer':
          whereClause.status = { [Op.in]: ['submitted', 'with_scrutinizer1', 'with_scrutinizer2'] };
          break;
        default:
          break;
      }
    }
    
    // Faculty always scoped to their own papers unless they explicitly passed a ?status param
    if (req.user.role === 'faculty' && !status) {
      whereClause.createdBy = req.user.id;
    }
    
    const papers = await QuestionPaper.findAll({
      where: whereClause,
      include: [
        { 
          model: Course,
          attributes: ['id', 'courseCode', 'courseName']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email', 'role']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'username', 'email', 'role']
        },
        {
          model: User,
          as: 'finalizer',
          attributes: ['id', 'username', 'email', 'role']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({
      success: true,
      count: papers.length,
      data: papers
    });
    
  } catch (error) {
    console.error('Error fetching question papers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch question papers',
      message: error.message
    });
  }
});

// Get single question paper by ID (All authenticated users)
router.get('/papers/:id', async (req, res) => {
  try {
    const User = require('../models/user');
    const Course = require('../models/Course');
    
    const paper = await QuestionPaper.findByPk(req.params.id, {
      include: [
        { 
          model: Course,
          attributes: ['id', 'courseCode', 'courseName', 'semester']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email', 'role']
        },
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'username', 'email', 'role']
        },
        {
          model: User,
          as: 'finalizer',
          attributes: ['id', 'username', 'email', 'role']
        },
        {
          model: Question
        }
      ]
    });
    
    if (!paper) {
      return res.status(404).json({
        success: false,
        error: 'Question paper not found'
      });
    }
    
    // Faculty can only view their own papers
    if (req.user.role === 'faculty' && paper.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only view your own question papers'
      });
    }

    // Enrich each question with per-question scrutinizer reviews
    try {
      const { rows: reviewRows } = await pool.query(
        `SELECT question_id, reviewer_role, status, suggestion_text, reviewed_at
         FROM question_reviews
         WHERE paper_id = $1
         ORDER BY reviewed_at ASC`,
        [paper.id]
      );
      const paperJson = paper.toJSON();
      paperJson.Questions = (paperJson.Questions || []).map(q => ({
        ...q,
        reviews: reviewRows.filter(r => r.question_id === q.id)
      }));
      return res.json({ success: true, data: paperJson });
    } catch (_reviewErr) {
      // question_reviews table may not exist yet — return paper without reviews
      return res.json({ success: true, data: paper });
    }
    
  } catch (error) {
    console.error('Error fetching question paper:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch question paper',
      message: error.message
    });
  }
});

// Bulk-save questions to a paper (Faculty only, paper must be draft or needs_revision)
router.post('/papers/:id/questions', canCreate, async (req, res) => {
  try {
    const paper = await QuestionPaper.findByPk(req.params.id);

    if (!paper) {
      return res.status(404).json({ success: false, error: 'Question paper not found' });
    }

    if (paper.createdBy !== req.user.id) {
      return res.status(403).json({ success: false, error: 'You can only add questions to your own papers' });
    }

    if (!['draft', 'needs_revision'].includes(paper.status)) {
      return res.status(400).json({ success: false, error: `Cannot modify a paper with status '${paper.status}'` });
    }

    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, error: 'questions array is required' });
    }

    // Replace any previously saved questions (idempotent re-save)
    await Question.destroy({ where: { QuestionPaperId: paper.id } });

    const records = questions.map(q => ({
      QuestionPaperId: paper.id,
      part: q.part,
      questionNumber: q.questionNumber,
      questionText: q.questionText,
      marks: q.marks,
      klLevel: q.klLevel || 'K1',
      piIndicators: q.piIndicators || [],
      CourseOutcomeId: q.courseOutcomeId || null
    }));

    const created = await Question.bulkCreate(records);

    res.status(201).json({ success: true, count: created.length, message: 'Questions saved successfully' });

  } catch (error) {
    console.error('Error saving questions:', error);
    res.status(500).json({ success: false, error: 'Failed to save questions', message: error.message });
  }
});

// Update question paper (Faculty and Scrutinizer)
router.put('/papers/:id', canEdit, async (req, res) => {
  try {
    const paper = await QuestionPaper.findByPk(req.params.id);
    
    if (!paper) {
      return res.status(404).json({
        success: false,
        error: 'Question paper not found'
      });
    }
    
    // Faculty can only edit their own papers
    if (req.user.role === 'faculty' && paper.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only edit your own question papers'
      });
    }
    
    // Scrutinizer can edit any paper
    // Update the paper
    await paper.update(req.body);
    
    res.json({
      success: true,
      message: 'Question paper updated successfully',
      data: paper
    });
    
  } catch (error) {
    console.error('Error updating question paper:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update question paper',
      message: error.message
    });
  }
});

// Submit question paper for review (Faculty only)
router.post('/papers/:id/submit', canCreate, async (req, res) => {
  try {
    const paper = await QuestionPaper.findByPk(req.params.id);
    
    if (!paper) {
      return res.status(404).json({
        success: false,
        error: 'Question paper not found'
      });
    }
    
    // Only creator can submit
    if (paper.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only submit your own question papers'
      });
    }
    
    // Faculty can submit from 'draft' or resubmit after 'needs_revision'
    if (!['draft', 'needs_revision'].includes(paper.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot submit a paper with status '${paper.status}'`
      });
    }
    
    // Always routes to Scrutinizer 1 queue
    await paper.update({ status: 'with_scrutinizer1' });
    
    res.json({
      success: true,
      message: 'Question paper submitted for review',
      data: paper
    });
    
  } catch (error) {
    console.error('Error submitting question paper:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit question paper',
      message: error.message
    });
  }
});

// Generic review endpoint (legacy / backward-compat for plain 'scrutinizer' role)
// New roles should use /api/scrutinizer/papers/:id/pass-to-s2 or /approve instead.
router.post('/papers/:id/review', canEdit, async (req, res) => {
  try {
    const { reviewComments } = req.body;
    
    if (!['scrutinizer', 'scrutinizer_1', 'scrutinizer_2'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Only Scrutinizers can review question papers'
      });
    }
    
    const paper = await QuestionPaper.findByPk(req.params.id);
    
    if (!paper) {
      return res.status(404).json({ success: false, error: 'Question paper not found' });
    }
    
    // Accept papers that are in a scrutinizer queue (any stage)
    const reviewableStages = ['submitted', 'with_scrutinizer1', 'with_scrutinizer2'];
    if (!reviewableStages.includes(paper.status)) {
      return res.status(400).json({
        success: false,
        error: `Paper cannot be reviewed at stage '${paper.status}'`
      });
    }
    
    await paper.update({
      status:      'reviewed',
      reviewedBy:  req.user.id,
      reviewComments
    });
    
    res.json({ success: true, message: 'Question paper reviewed successfully', data: paper });
    
  } catch (error) {
    console.error('Error reviewing question paper:', error);
    res.status(500).json({ success: false, error: 'Failed to review question paper', message: error.message });
  }
});

// Panel Member approves the final paper and sends it to the HOD
router.post('/papers/:id/panel-approve', async (req, res) => {
  try {
    if (req.user.role !== 'panel_member') {
      return res.status(403).json({ success: false, error: 'Only Panel Members can approve at this stage' });
    }
    
    const paper = await QuestionPaper.findByPk(req.params.id);
    if (!paper) return res.status(404).json({ success: false, error: 'Question paper not found' });
    
    if (!['with_panel', 'randomized'].includes(paper.status)) {
      return res.status(400).json({
        success: false,
        error: `Paper must be in the panel queue to forward to HOD. Current: '${paper.status}'`
      });
    }
    
    const { panelComments } = req.body;
    await paper.update({
      status:       'with_hod',
      panelMemberId: req.user.id,
      reviewComments: panelComments || paper.reviewComments,
    });
    
    res.json({ success: true, message: 'Paper forwarded to HOD for final approval', data: paper });
    
  } catch (error) {
    console.error('Error in panel approval:', error);
    res.status(500).json({ success: false, error: 'Failed to approve paper', message: error.message });
  }
});

// HOD final approval
router.post('/papers/:id/finalize', canFinalize, async (req, res) => {
  try {
    const { finalizationNotes } = req.body;
    
    const paper = await QuestionPaper.findByPk(req.params.id);
    if (!paper) return res.status(404).json({ success: false, error: 'Question paper not found' });
    
    // Accept both legacy 'reviewed' status and new 'with_hod' status
    if (!['reviewed', 'with_hod'].includes(paper.status)) {
      return res.status(400).json({
        success: false,
        error: `Paper must be at the HOD stage to finalize. Current: '${paper.status}'`
      });
    }
    
    await paper.update({
      status:           'hod_approved',
      finalizedBy:      req.user.id,
      finalizationNotes
    });
    
    res.json({ success: true, message: 'Question paper finalized by HOD', data: paper });
    
  } catch (error) {
    console.error('Error finalizing question paper:', error);
    res.status(500).json({ success: false, error: 'Failed to finalize question paper', message: error.message });
  }
});

module.exports = router;