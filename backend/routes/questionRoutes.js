const express = require('express');
const router = express.Router();
const NLPService = require('../services/nlpService');
const QuestionPaper = require('../models/QuestionPaper');
const Question = require('../models/Question');
const { protect, canCreate, canEdit, canFinalize } = require('../middleware/authMiddleware');

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

// Get all question papers (All authenticated users can view)
router.get('/papers', async (req, res) => {
  try {
    const { status, role } = req.query;
    const User = require('../models/user');
    const Course = require('../models/Course');
    
    let whereClause = {};
    
    // Filter by status if provided
    if (status) {
      whereClause.status = status;
    }
    
    // Faculty can only see their own papers
    if (req.user.role === 'faculty') {
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
    
    res.json({
      success: true,
      data: paper
    });
    
  } catch (error) {
    console.error('Error fetching question paper:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch question paper',
      message: error.message
    });
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
    
    // Check if already submitted
    if (paper.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Question paper has already been submitted'
      });
    }
    
    await paper.update({ status: 'submitted' });
    
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

// Review question paper (Scrutinizer only)
router.post('/papers/:id/review', canEdit, async (req, res) => {
  try {
    const { reviewComments } = req.body;
    
    // Only scrutinizer can review
    if (req.user.role !== 'scrutinizer') {
      return res.status(403).json({
        success: false,
        error: 'Only Scrutinizers can review question papers'
      });
    }
    
    const paper = await QuestionPaper.findByPk(req.params.id);
    
    if (!paper) {
      return res.status(404).json({
        success: false,
        error: 'Question paper not found'
      });
    }
    
    if (paper.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        error: 'Only submitted papers can be reviewed'
      });
    }
    
    await paper.update({
      status: 'reviewed',
      reviewedBy: req.user.id,
      reviewComments
    });
    
    res.json({
      success: true,
      message: 'Question paper reviewed successfully',
      data: paper
    });
    
  } catch (error) {
    console.error('Error reviewing question paper:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to review question paper',
      message: error.message
    });
  }
});

// Finalize question paper (HOD only)
router.post('/papers/:id/finalize', canFinalize, async (req, res) => {
  try {
    const { finalizationNotes } = req.body;
    
    const paper = await QuestionPaper.findByPk(req.params.id);
    
    if (!paper) {
      return res.status(404).json({
        success: false,
        error: 'Question paper not found'
      });
    }
    
    if (paper.status !== 'reviewed') {
      return res.status(400).json({
        success: false,
        error: 'Only reviewed papers can be finalized'
      });
    }
    
    await paper.update({
      status: 'finalized',
      finalizedBy: req.user.id,
      finalizationNotes
    });
    
    res.json({
      success: true,
      message: 'Question paper finalized successfully',
      data: paper
    });
    
  } catch (error) {
    console.error('Error finalizing question paper:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to finalize question paper',
      message: error.message
    });
  }
});

module.exports = router;