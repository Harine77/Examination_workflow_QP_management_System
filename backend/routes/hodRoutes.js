// routes/hodRoutes.js
// HOD (Head of Department) can approve final question papers
// Panel Members can review and submit papers to HOD

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { protect } = require('../middleware/authMiddleware');
const QuestionPaper = require('../models/QuestionPaper');
const Question = require('../models/Question');
const Course = require('../models/Course');
const User = require('../models/user');

// ── Auth: all HOD/Panel routes require a valid JWT ─────────────────────────
router.use(protect);

// ── Permission helpers ──────────────────────────────────────────────────────

function requireHod(req, res, next) {
  if (req.user.role !== 'hod') {
    return res.status(403).json({ success: false, error: 'HOD access only' });
  }
  next();
}

function requirePanelMember(req, res, next) {
  if (!['panel_member', 'panel'].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Panel Member access only' });
  }
  next();
}

// Helper to build question sections for display
function buildQuestionSections(questions) {
  const sections = { '2M': [], '6M': [], '12M': [] };
  
  for (const q of questions) {
    let section;
    if (q.part === 'A' || q.marks === 2) section = '2M';
    else if (q.part === 'B' || q.marks === 6) section = '6M';
    else section = '12M';

    if (sections[section]) {
      sections[section].push({
        id: q.id,
        part: q.part,
        questionNumber: q.questionNumber,
        marks: q.marks,
        question: q.questionText,
      });
    }
  }
  
  return sections;
}

// ── GET /api/hod/papers ────────────────────────────────────────────────────
// HOD sees all papers that are ready for HOD approval (status = 'with_hod')
router.get('/papers', requireHod, async (req, res) => {
  try {
    const papers = await QuestionPaper.findAll({
      where: { status: 'with_hod' },
      include: [
        { model: Course, attributes: ['id', 'courseCode', 'courseName'] },
        { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
        { model: Question }
      ],
      order: [['createdAt', 'DESC']]
    });

    const papersData = papers.map(paper => ({
      id: paper.id,
      courseCode: paper.Course?.courseCode || '?',
      courseName: paper.Course?.courseName || 'Unknown',
      examType: paper.examType,
      catNumber: paper.catNumber,
      examDate: paper.examDate,
      createdBy: paper.creator?.username || 'Unknown',
      sections: buildQuestionSections(paper.Questions || []),
      panelMemberComments: paper.panelMemberComments || null,
      status: paper.status,
      createdAt: paper.createdAt
    }));

    res.json({ success: true, papers: papersData });
  } catch (err) {
    console.error('GET /hod/papers:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/hod/papers/:id/approve ────────────────────────────────────────
// HOD approves a paper
router.post('/papers/:id/approve', requireHod, async (req, res) => {
  const { comments } = req.body;
  
  try {
    const paper = await QuestionPaper.findByPk(req.params.id);
    if (!paper) {
      return res.status(404).json({ success: false, error: 'Paper not found' });
    }

    if (paper.status !== 'with_hod') {
      return res.status(400).json({
        success: false,
        error: `Paper is at stage '${paper.status}'. Must be at HOD for approval.`
      });
    }

    await paper.update({
      status: 'hod_approved',
      hodId: req.user.id,
      hodComments: comments || null
    });

    res.json({
      success: true,
      message: 'Paper approved by HOD. Workflow complete!',
      data: paper
    });
  } catch (err) {
    console.error('POST /hod/papers/:id/approve:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/hod/papers/:id/reject ────────────────────────────────────────
// HOD rejects a paper and sends it back to Panel Member for revision
router.post('/papers/:id/reject', requireHod, async (req, res) => {
  const { comments } = req.body;
  if (!comments?.trim()) {
    return res.status(400).json({ success: false, error: 'Rejection comments are required' });
  }
  
  try {
    const paper = await QuestionPaper.findByPk(req.params.id);
    if (!paper) {
      return res.status(404).json({ success: false, error: 'Paper not found' });
    }

    if (paper.status !== 'with_hod') {
      return res.status(400).json({
        success: false,
        error: `Paper is at stage '${paper.status}'. Must be at HOD for rejection.`
      });
    }

    await paper.update({
      status: 'with_panel',
      hodComments: comments
    });

    res.json({
      success: true,
      message: 'Paper rejected and sent back to Panel Member for revision',
      data: paper
    });
  } catch (err) {
    console.error('POST /hod/papers/:id/reject:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/panel/papers ──────────────────────────────────────────────────
// Panel Members see only the final papers:
//   - Shuffled papers (isShuffled = true) when multiple QPs existed for a course
//   - Single papers (isShuffled = false) when only one QP existed for a course
//     i.e. for each course, if a shuffled paper exists show only that,
//     otherwise show the single with_panel paper.
router.get('/panel/papers', requirePanelMember, async (req, res) => {
  try {
    const allPanelPapers = await QuestionPaper.findAll({
      where: { status: 'with_panel' },
      include: [
        { model: Course, attributes: ['id', 'courseCode', 'courseName'] },
        { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
        { model: Question }
      ],
      order: [['createdAt', 'DESC']],
    });

    // For each course: if a shuffled paper exists → show only that.
    // If no shuffled paper → show the single paper.
    const courseMap = {};
    for (const p of allPanelPapers) {
      const cid = p.CourseId;
      if (!courseMap[cid]) {
        courseMap[cid] = { shuffled: null, single: null };
      }
      if (p.isShuffled) {
        courseMap[cid].shuffled = p;
      } else {
        // keep the most recent single paper per course
        if (!courseMap[cid].single) courseMap[cid].single = p;
      }
    }

    const finalPapers = Object.values(courseMap).map(g => g.shuffled || g.single).filter(Boolean);

    const papersData = finalPapers.map(paper => ({
      id: paper.id,
      courseCode: paper.Course?.courseCode || '?',
      courseName: paper.Course?.courseName || 'Unknown',
      examType: paper.examType,
      catNumber: paper.catNumber,
      examDate: paper.examDate,
      createdBy: paper.creator?.username || 'Unknown',
      isShuffled: paper.isShuffled,
      sections: buildQuestionSections(paper.Questions || []),
      status: paper.status,
      scrutinizer2Comments: paper.scrutinizer2Comments || null,
      createdAt: paper.createdAt
    }));

    res.json({ success: true, papers: papersData });
  } catch (err) {
    console.error('GET /panel/papers:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/panel/papers/:id/submit ──────────────────────────────────────
// Panel Member submits paper to HOD for final approval
router.post('/panel/papers/:id/submit', requirePanelMember, async (req, res) => {
  const { comments } = req.body;
  
  try {
    const paper = await QuestionPaper.findByPk(req.params.id);
    if (!paper) {
      return res.status(404).json({ success: false, error: 'Paper not found' });
    }

    if (paper.status !== 'with_panel') {
      return res.status(400).json({
        success: false,
        error: `Paper is at stage '${paper.status}'. Must be at Panel for submission.`
      });
    }

    await paper.update({
      status: 'with_hod',
      panelMemberId: req.user.id,
      panelMemberComments: comments || null
    });

    res.json({
      success: true,
      message: 'Paper submitted to HOD for final approval',
      data: paper
    });
  } catch (err) {
    console.error('POST /panel/papers/:id/submit:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/hod/status ────────────────────────────────────────────────────
// Get dashboard statistics for HOD
router.get('/status', requireHod, async (req, res) => {
  try {
    const withHod = await QuestionPaper.count({ where: { status: 'with_hod' } });
    const approved = await QuestionPaper.count({ where: { status: 'hod_approved' } });
    const total = await QuestionPaper.count();

    res.json({
      success: true,
      summary: {
        total,
        withHod,
        approved,
        pending: withHod
      }
    });
  } catch (err) {
    console.error('GET /hod/status:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/panel/status ──────────────────────────────────────────────────
// Get dashboard statistics for Panel Member
router.get('/panel/status', requirePanelMember, async (req, res) => {
  try {
    const withPanel = await QuestionPaper.count({ where: { status: 'with_panel' } });
    const submitted = await QuestionPaper.count({ where: { status: 'with_hod' } });

    res.json({
      success: true,
      summary: {
        withPanel,
        submitted
      }
    });
  } catch (err) {
    console.error('GET /panel/status:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/activity-log ──────────────────────────────────────────────────
// Get activity log for a specific paper (visible to all stakeholders)
router.get('/papers/:id/activity-log', protect, async (req, res) => {
  try {
    const paper = await QuestionPaper.findByPk(req.params.id, {
      include: [
        { model: Course, attributes: ['courseCode', 'courseName'] },
        { model: User, as: 'creator', attributes: ['username', 'email'] }
      ]
    });

    if (!paper) {
      return res.status(404).json({ success: false, error: 'Paper not found' });
    }

    const activity = [];

    if (paper.createdBy) {
      activity.push({
        stage: 'draft',
        action: 'Created',
        actor: paper.creator?.username || 'Faculty',
        timestamp: paper.createdAt,
        comments: null
      });
    }

    if (paper.scrutinizer1Id) {
      activity.push({
        stage: 'with_scrutinizer1',
        action: 'Passed to Scrutinizer 2',
        actor: 'Scrutinizer 1',
        timestamp: paper.updatedAt,
        comments: paper.scrutinizer1Comments
      });
    }

    if (paper.scrutinizer2Id) {
      const action = paper.status === 'scrutinizer2_approved' ? 'Approved' : 'Sent back to Faculty';
      activity.push({
        stage: 'with_scrutinizer2',
        action,
        actor: 'Scrutinizer 2',
        timestamp: paper.updatedAt,
        comments: paper.scrutinizer2Comments
      });
    }

    if (paper.panelMemberId) {
      activity.push({
        stage: 'with_panel',
        action: 'Submitted to HOD',
        actor: 'Panel Member',
        timestamp: paper.updatedAt,
        comments: paper.panelMemberComments
      });
    }

    if (paper.hodId && paper.status === 'hod_approved') {
      activity.push({
        stage: 'hod_approved',
        action: 'Approved (Final)',
        actor: 'HOD',
        timestamp: paper.updatedAt,
        comments: paper.hodComments
      });
    }

    res.json({
      success: true,
      paper: {
        id: paper.id,
        courseCode: paper.Course?.courseCode,
        courseName: paper.Course?.courseName,
        status: paper.status,
        currentStage: paper.status
      },
      activity
    });
  } catch (err) {
    console.error('GET /papers/:id/activity-log:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
