// routes/notificationRoutes.js
// In-app notifications for Scrutinizer 2 and Panel Member

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { protect } = require('../middleware/authMiddleware');
const QuestionPaper = require('../models/QuestionPaper');
const Course = require('../models/Course');
const User = require('../models/user');

router.use(protect);

// ── GET /api/notifications ─────────────────────────────────────────────────
// Returns relevant paper status updates for the logged-in user
router.get('/', async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;
    let papers = [];

    if (role === 'scrutinizer_2' || role === 'scrutinizer') {
      // S2: papers they approved that have moved forward
      papers = await QuestionPaper.findAll({
        where: {
          scrutinizer2Id: userId,
          status: { [Op.in]: ['with_panel', 'with_hod', 'hod_approved'] }
        },
        include: [{ model: Course, attributes: ['courseCode', 'courseName'] }],
        order: [['updatedAt', 'DESC']],
        limit: 20,
      });
    } else if (role === 'panel_member' || role === 'panel') {
      // Panel: papers they submitted to HOD
      papers = await QuestionPaper.findAll({
        where: {
          panelMemberId: userId,
          status: { [Op.in]: ['with_hod', 'hod_approved', 'with_panel'] }
        },
        include: [{ model: Course, attributes: ['courseCode', 'courseName'] }],
        order: [['updatedAt', 'DESC']],
        limit: 20,
      });
    }

    const notifications = papers.map(p => {
      const label = `${p.Course?.courseCode || '?'} ${p.examType}${p.catNumber ? ' ' + p.catNumber : ''}`;
      let message = '';
      let type = 'info'; // info | success | warning

      if (role === 'scrutinizer_2' || role === 'scrutinizer') {
        if (p.status === 'with_panel')   { message = `Paper sent to Panel Member`; type = 'info'; }
        if (p.status === 'with_hod')     { message = `Panel forwarded to HOD`; type = 'info'; }
        if (p.status === 'hod_approved') { message = `HOD gave final approval ✅`; type = 'success'; }
      } else {
        if (p.status === 'with_hod')     { message = `Submitted to HOD — awaiting approval`; type = 'info'; }
        if (p.status === 'hod_approved') { message = `HOD approved this paper ✅`; type = 'success'; }
        if (p.status === 'with_panel')   { message = `HOD returned for revision ⚠`; type = 'warning'; }
      }

      return {
        id: p.id,
        paperId: p.id,
        label,
        courseName: p.Course?.courseName || '',
        status: p.status,
        message,
        type,
        updatedAt: p.updatedAt,
        hodComments: p.hodComments || null,
        scrutinizer2Comments: p.scrutinizer2Comments || null,
      };
    });

    res.json({ success: true, notifications });
  } catch (err) {
    console.error('GET /notifications:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
