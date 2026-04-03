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
const { generateAnswerKey } = require('../services/ollamaAnswerKeyService');

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

function serializePaper(paper) {
  return {
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
    panelMemberComments: paper.panelMemberComments || null,
    hodComments: paper.hodComments || null,
    answerKeyGeneratedAt: paper.answerKeyGeneratedAt || null,
    createdAt: paper.createdAt,
    updatedAt: paper.updatedAt,
  };
}

function buildPanelNotifications({ pendingReview, submittedToHod, returnedToFaculties, hodApproved }) {
  const notifications = [];

  submittedToHod.forEach((paper) => {
    notifications.push({
      id: `panel-submitted-${paper.id}`,
      type: 'info',
      title: `${paper.courseCode} was submitted to HOD`,
      message: paper.panelMemberComments || 'Awaiting final decision from HOD.',
      paperId: paper.id,
      createdAt: paper.updatedAt,
    });
  });

  hodApproved.forEach((paper) => {
    notifications.push({
      id: `panel-approved-${paper.id}`,
      type: 'success',
      title: `HOD approved ${paper.courseCode}`,
      message: paper.hodComments || 'The paper has received final HOD approval.',
      paperId: paper.id,
      createdAt: paper.updatedAt,
    });
  });

  returnedToFaculties.forEach((paper) => {
    notifications.push({
      id: `panel-returned-${paper.id}`,
      type: 'success',
      title: `${paper.courseCode} was returned to faculties`,
      message: paper.answerKeyGeneratedAt ? 'Answer key generated and shared with faculties.' : 'Returned to faculties.',
      paperId: paper.id,
      createdAt: paper.updatedAt,
    });
  });

  pendingReview.forEach((paper) => {
    notifications.push({
      id: `panel-pending-${paper.id}`,
      type: 'warning',
      title: `${paper.courseCode} is waiting for panel review`,
      message: 'Choose whether to submit it to HOD or return it to faculties.',
      paperId: paper.id,
      createdAt: paper.createdAt,
    });
  });

  return notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function buildHodNotifications({ pendingApproval, approvedPapers }) {
  const notifications = [];

  pendingApproval.forEach((paper) => {
    notifications.push({
      id: `hod-pending-${paper.id}`,
      type: 'warning',
      title: `${paper.courseCode} is awaiting your approval`,
      message: paper.panelMemberComments || 'Panel has submitted this paper for HOD review.',
      paperId: paper.id,
      createdAt: paper.updatedAt,
    });
  });

  approvedPapers.forEach((paper) => {
    notifications.push({
      id: `hod-approved-${paper.id}`,
      type: 'success',
      title: `You approved ${paper.courseCode}`,
      message: paper.hodComments || 'Workflow completed successfully.',
      paperId: paper.id,
      createdAt: paper.updatedAt,
    });
  });

  return notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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

    const papersData = papers.map(serializePaper);

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

    const papersData = finalPapers.map(serializePaper);

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

router.get('/panel/overview', requirePanelMember, async (req, res) => {
  try {
    const papers = await QuestionPaper.findAll({
      where: {
        status: { [Op.in]: ['with_panel', 'with_hod', 'hod_approved', 'returned_to_faculties', 'finalized', 'reviewed', 'randomized'] },
      },
      include: [
        { model: Course, attributes: ['id', 'courseCode', 'courseName'] },
        { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
        { model: Question },
      ],
      order: [['updatedAt', 'DESC']],
    });

    const serialized = papers.map(serializePaper);
    const pendingReview = serialized.filter((paper) => ['with_panel', 'randomized', 'finalized'].includes(paper.status));
    const submittedToHod = serialized.filter((paper) => ['with_hod', 'reviewed'].includes(paper.status));
    const returnedToFaculties = serialized.filter((paper) => paper.status === 'returned_to_faculties');
    const hodApproved = serialized.filter((paper) => paper.status === 'hod_approved');

    res.json({
      success: true,
      pendingReview,
      submittedToHod,
      returnedToFaculties,
      hodApproved,
      notifications: buildPanelNotifications({ pendingReview, submittedToHod, returnedToFaculties, hodApproved }),
    });
  } catch (err) {
    console.error('GET /panel/overview:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/overview', requireHod, async (req, res) => {
  try {
    const papers = await QuestionPaper.findAll({
      where: { status: { [Op.in]: ['with_hod', 'hod_approved', 'reviewed', 'finalized'] } },
      include: [
        { model: Course, attributes: ['id', 'courseCode', 'courseName'] },
        { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
        { model: Question },
      ],
      order: [['updatedAt', 'DESC']],
    });

    const serialized = papers.map(serializePaper);
    const pendingApproval = serialized.filter((paper) => ['with_hod', 'reviewed'].includes(paper.status));
    const approvedPapers = serialized.filter((paper) => ['hod_approved', 'finalized'].includes(paper.status));

    res.json({
      success: true,
      pendingApproval,
      approvedPapers,
      notifications: buildHodNotifications({ pendingApproval, approvedPapers }),
    });
  } catch (err) {
    console.error('GET /hod/overview:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Panel Member returns paper to faculties WITHOUT answer key (status update only)
// Answer key is generated on the frontend via Ollama and saved separately
router.post('/panel/papers/:id/return-to-faculties-simple', requirePanelMember, async (req, res) => {
  const { comments } = req.body;
  try {
    const paper = await QuestionPaper.findByPk(req.params.id);
    if (!paper) return res.status(404).json({ success: false, error: 'Paper not found' });

    if (!['with_panel', 'with_hod', 'hod_approved'].includes(paper.status)) {
      return res.status(400).json({
        success: false,
        error: `Paper is at stage '${paper.status}'. Must be with Panel, HOD, or HOD approved.`,
      });
    }

    await paper.update({
      status: 'returned_to_faculties',
      panelMemberId: req.user.id,
      panelMemberComments: comments || null,
    });

    res.json({ success: true, message: 'Paper returned to faculties', data: paper });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save answer key generated on the frontend
router.post('/panel/papers/:id/save-answer-key', requirePanelMember, async (req, res) => {
  const { answerKey, model } = req.body;
  try {
    const paper = await QuestionPaper.findByPk(req.params.id);
    if (!paper) return res.status(404).json({ success: false, error: 'Paper not found' });

    await paper.update({
      answerKey: answerKey || null,
      answerKeyModel: model || 'llama3.2:1b',
      answerKeyGeneratedAt: new Date(),
    });

    res.json({ success: true, message: 'Answer key saved' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Panel Member finalizes the paper, generates an answer key via Ollama,
// and returns the finalized paper to all faculties.
router.post('/panel/papers/:id/return-to-faculties', requirePanelMember, async (req, res) => {
  const { comments } = req.body;

  try {
    const paper = await QuestionPaper.findByPk(req.params.id, {
      include: [
        { model: Course, attributes: ['id', 'courseCode', 'courseName'] },
        { model: Question },
      ],
    });

    if (!paper) {
      return res.status(404).json({ success: false, error: 'Paper not found' });
    }

    if (!['with_panel', 'with_hod', 'hod_approved'].includes(paper.status)) {
      return res.status(400).json({
        success: false,
        error: `Paper is at stage '${paper.status}'. It must be with Panel, submitted to HOD, or HOD approved before returning to faculties.`,
      });
    }

    const { answerKey, model } = await generateAnswerKey(paper);

    await paper.update({
      status: 'returned_to_faculties',
      panelMemberId: req.user.id,
      panelMemberComments: comments || null,
      answerKey,
      answerKeyModel: model,
      answerKeyGeneratedAt: new Date(),
    });

    res.json({
      success: true,
      message: 'Finalized paper returned to all faculties with an AI-generated answer key',
      data: paper,
    });
  } catch (err) {
    console.error('POST /panel/papers/:id/return-to-faculties:', err.message);
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
    const returnedToFaculties = await QuestionPaper.count({ where: { status: 'returned_to_faculties' } });

    res.json({
      success: true,
      summary: {
        withPanel,
        submitted,
        returnedToFaculties,
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
