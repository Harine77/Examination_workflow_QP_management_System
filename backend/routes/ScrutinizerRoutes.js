const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { protect } = require('../middleware/authMiddleware');
const QuestionPaper = require('../models/QuestionPaper');
const Question = require('../models/Question');
const Course = require('../models/Course');
const User = require('../models/user');
const { Op } = require('sequelize');

// All scrutinizer routes require authentication
router.use(protect);

// PostgreSQL connection (for question_reviews raw table)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'exam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

// ─────────────────────────────────────────────
// Helper: build sections from Questions array
// ─────────────────────────────────────────────
function buildSections(questions) {
  const sections = { '2M': [], '6M': [], '12M': [] };
  for (const q of questions) {
    let sec;
    if (q.marks === 2 || q.part === 'A') sec = '2M';
    else if (q.marks === 6 || q.part === 'B') sec = '6M';
    else sec = '12M';
    if (sections[sec]) {
      sections[sec].push({
        id: q.id,
        paper_title: null, // filled below
        section: sec,
        question_no: q.questionNumber,
        marks: q.marks,
        question: q.questionText,
        review_status: null,
        review_suggestion: null,
      });
    }
  }
  return sections;
}

// ─────────────────────────────────────────────
// GET /api/scrutinizer/papers
// Returns papers relevant to the caller's role
// ─────────────────────────────────────────────
router.get('/papers', async (req, res) => {
  try {
    let whereClause = {};
    const role = req.user.role;

    if (role === 'scrutinizer_1' || role === 'scrutinizer') {
      whereClause.status = 'with_scrutinizer1';
    } else if (role === 'scrutinizer_2') {
      whereClause.status = { [Op.in]: ['with_scrutinizer2', 'scrutinizer2_approved'] };
    } else {
      whereClause.status = { [Op.in]: ['with_scrutinizer1', 'with_scrutinizer2', 'scrutinizer2_approved'] };
    }

    const dbPapers = await QuestionPaper.findAll({
      where: whereClause,
      include: [
        { model: Course, attributes: ['id', 'courseCode', 'courseName'] },
        { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
        { model: Question },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Fetch all question_reviews for these papers
    let reviewRows = [];
    if (dbPapers.length > 0) {
      const paperIds = dbPapers.map(p => p.id);
      try {
        const { rows } = await pool.query(
          `SELECT paper_id, question_id, status, suggestion_text FROM question_reviews WHERE paper_id = ANY($1)`,
          [paperIds]
        );
        reviewRows = rows;
      } catch (_) { /* table may not exist yet */ }
    }

    const papers = dbPapers.map(paper => {
      const paperTitle = `${paper.Course?.courseCode || 'Paper'} ${paper.examType}${paper.catNumber ? '-' + paper.catNumber : ''}`;
      const sections = buildSections(paper.Questions || []);

      // Attach paper_title and review status to each question
      let approved = 0, suggested = 0, reviewed = 0;
      for (const sec of Object.values(sections)) {
        for (const q of sec) {
          q.paper_title = paperTitle;
          const rev = reviewRows.find(r => r.paper_id === paper.id && r.question_id === q.id);
          if (rev) {
            q.review_status = rev.status;
            q.review_suggestion = rev.suggestion_text;
            reviewed++;
            if (rev.status === 'APPROVED') approved++;
            else if (rev.status === 'SUGGESTED') suggested++;
          }
        }
      }

      const total = (paper.Questions || []).length;
      let status = 'PENDING';
      if (reviewed > 0 && approved === total) status = 'APPROVED';
      else if (suggested > 0) status = 'NEEDS_REVISION';
      else if (reviewed > 0) status = 'IN_PROGRESS';

      return {
        paper_id: paper.id,
        paper_title: paperTitle,
        workflow_status: paper.status,
        status,
        progress: { total, approved, suggested, reviewed },
        sections,
        courseCode: paper.Course?.courseCode,
        courseName: paper.Course?.courseName,
        examType: paper.examType,
        catNumber: paper.catNumber,
        createdBy: paper.creator?.username,
        createdAt: paper.createdAt,
      };
    });

    res.json({ success: true, papers });
  } catch (err) {
    console.error('GET /scrutinizer/papers:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/scrutinizer/reviews
// Returns all question_reviews for the current user
// ─────────────────────────────────────────────
router.get('/reviews', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT qr.paper_id, qr.question_id, qr.status, qr.suggestion_text, qr.reviewed_at,
              q."questionNumber" AS question_no,
              qp."examType", qp."catNumber"
       FROM question_reviews qr
       JOIN "Questions" q ON q.id = qr.question_id
       JOIN "QuestionPapers" qp ON qp.id = qr.paper_id
       WHERE qr.reviewer_id = $1
       ORDER BY qr.reviewed_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, reviews: rows });
  } catch (err) {
    // table may not exist yet
    res.json({ success: true, reviews: [] });
  }
});

// ─────────────────────────────────────────────
// POST /api/scrutinizer/review
// Save a single question review decision
// ─────────────────────────────────────────────
router.post('/review', async (req, res) => {
  const { paper_title, question_no, status, suggestion_text } = req.body;

  if (!paper_title || !question_no || !status) {
    return res.status(400).json({ success: false, error: 'paper_title, question_no, and status are required' });
  }

  try {
    // Find the question by number — look up paper by title pattern
    const { rows: qRows } = await pool.query(
      `SELECT q.id, q."QuestionPaperId" FROM "Questions" q
       JOIN "QuestionPapers" qp ON qp.id = q."QuestionPaperId"
       JOIN "Courses" c ON c.id = qp."CourseId"
       WHERE q."questionNumber" = $1
       LIMIT 1`,
      [question_no]
    );

    if (!qRows.length) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    const { id: question_id, QuestionPaperId: paper_id } = qRows[0];
    const reviewer_role = req.user.role;

    await pool.query(
      `INSERT INTO question_reviews (paper_id, question_id, reviewer_id, reviewer_role, status, suggestion_text)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (paper_id, question_id, reviewer_role)
       DO UPDATE SET status = EXCLUDED.status, suggestion_text = EXCLUDED.suggestion_text, reviewed_at = NOW()`,
      [paper_id, question_id, req.user.id, reviewer_role, status, suggestion_text || null]
    );

    res.json({ success: true, message: 'Review saved' });
  } catch (err) {
    console.error('POST /scrutinizer/review:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/scrutinizer/review/bulk
// Bulk approve all questions in a paper
// ─────────────────────────────────────────────
router.post('/review/bulk', async (req, res) => {
  const { paper_title, status } = req.body;
  if (!paper_title || !status) {
    return res.status(400).json({ success: false, error: 'paper_title and status are required' });
  }

  try {
    const { rows: qRows } = await pool.query(
      `SELECT q.id, q."QuestionPaperId" FROM "Questions" q
       JOIN "QuestionPapers" qp ON qp.id = q."QuestionPaperId"
       JOIN "Courses" c ON c.id = qp."CourseId"
       WHERE qp.id IN (
         SELECT id FROM "QuestionPapers" LIMIT 100
       )`,
      []
    );

    const reviewer_role = req.user.role;
    for (const q of qRows) {
      await pool.query(
        `INSERT INTO question_reviews (paper_id, question_id, reviewer_id, reviewer_role, status, suggestion_text)
         VALUES ($1, $2, $3, $4, $5, NULL)
         ON CONFLICT (paper_id, question_id, reviewer_role)
         DO UPDATE SET status = EXCLUDED.status, suggestion_text = NULL, reviewed_at = NOW()`,
        [q.QuestionPaperId, q.id, req.user.id, reviewer_role, status]
      );
    }

    res.json({ success: true, message: `Bulk ${status} applied` });
  } catch (err) {
    console.error('POST /scrutinizer/review/bulk:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/scrutinizer/approved-papers
// Returns papers grouped by course for S2 randomization panel
// ─────────────────────────────────────────────
router.get('/approved-papers', async (req, res) => {
  try {
    const papers = await QuestionPaper.findAll({
      where: { status: 'with_scrutinizer2' },
      include: [{ model: Course, attributes: ['id', 'courseCode', 'courseName'] }],
      order: [['createdAt', 'DESC']],
    });

    // Group by course
    const groupMap = {};
    for (const p of papers) {
      const cid = p.Course?.id;
      if (!cid) continue;
      if (!groupMap[cid]) {
        groupMap[cid] = {
          courseId: cid,
          courseCode: p.Course.courseCode,
          courseName: p.Course.courseName,
          count: 0,
          readyForRandomization: false,
        };
      }
      groupMap[cid].count++;
    }
    // Need at least 2 papers to shuffle
    for (const g of Object.values(groupMap)) {
      g.readyForRandomization = g.count >= 2;
    }

    res.json({ success: true, groups: Object.values(groupMap), data: papers });
  } catch (err) {
    console.error('GET /scrutinizer/approved-papers:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/scrutinizer/papers/:id/verify-mapping
// Scrutinizer 2: run CO/KL analysis on all questions in a paper
// and compare against what faculty assigned
// ─────────────────────────────────────────────
router.get('/papers/:id/verify-mapping', async (req, res) => {
  try {
    const CourseOutcome = require('../models/CourseOutcome');
    const paper = await QuestionPaper.findByPk(req.params.id, {
      include: [
        { model: Course, attributes: ['id', 'courseCode', 'courseName'] },
        { model: Question, include: [{ model: CourseOutcome, attributes: ['id', 'coNumber'] }] },
      ],
    });

    if (!paper) return res.status(404).json({ success: false, error: 'Paper not found' });

    const NLPService = require('../services/nlpService');
    const questions = paper.Questions || [];
    const results = [];

    for (const q of questions) {
      let analysis = null;
      let error = null;
      try {
        analysis = await NLPService.analyzeQuestion(q.questionText, paper.CourseId);
      } catch (e) {
        error = e.message;
      }

      const assignedKL = q.klLevel || null;
      const assignedCO = q.CourseOutcome?.coNumber || null;  // e.g. "CO1", not "CO24"
      const suggestedKL = analysis?.kl?.level || null;
      const suggestedCO = analysis?.co?.number || null;

      const klMatch = assignedKL && suggestedKL ? assignedKL === suggestedKL : null;
      const coMatch = assignedCO && suggestedCO ? assignedCO === suggestedCO : null;
      const isValid = klMatch !== false && coMatch !== false;

      results.push({
        id: q.id,
        questionNumber: q.questionNumber,
        part: q.part,
        marks: q.marks,
        questionText: q.questionText,
        assigned: { kl: assignedKL, co: assignedCO },
        suggested: {
          kl: suggestedKL,
          co: suggestedCO,
          klVerb: analysis?.kl?.verb,
          klConfidence: analysis?.kl?.confidence,
          coConfidence: analysis?.co?.confidence,
          coDescription: analysis?.co?.description,
        },
        klMatch,
        coMatch,
        isValid,
        error,
      });
    }

    const totalQ = results.length;
    const validQ = results.filter(r => r.isValid).length;
    const klMismatches = results.filter(r => r.klMatch === false).length;
    const coMismatches = results.filter(r => r.coMatch === false).length;

    res.json({
      success: true,
      paperId: paper.id,
      courseCode: paper.Course?.courseCode,
      courseName: paper.Course?.courseName,
      summary: { totalQ, validQ, klMismatches, coMismatches, allValid: validQ === totalQ },
      questions: results,
    });
  } catch (err) {
    console.error('GET /scrutinizer/papers/:id/verify-mapping:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/scrutinizer/paper/:id/questions
// ─────────────────────────────────────────────
router.get('/paper/:id/questions', async (req, res) => {
  const paperId = req.params.id;
  try {
    const { rows } = await pool.query(
      `SELECT * FROM "Questions" WHERE "QuestionPaperId" = $1 ORDER BY id`,
      [paperId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching questions:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/scrutinizer/papers/:id/pass-to-s2
// Scrutinizer 1 passes paper to Scrutinizer 2
// ─────────────────────────────────────────────
router.post('/papers/:id/pass-to-s2', async (req, res) => {
  const { comments } = req.body;
  try {
    const paper = await QuestionPaper.findByPk(req.params.id);
    if (!paper) return res.status(404).json({ success: false, error: 'Paper not found' });

    if (paper.status !== 'with_scrutinizer1') {
      return res.status(400).json({ success: false, error: `Paper must be at scrutinizer1 stage. Current: '${paper.status}'` });
    }

    await paper.update({
      status: 'with_scrutinizer2',
      scrutinizer1Id: req.user.id,
      scrutinizer1Comments: comments || null,
    });

    res.json({ success: true, message: 'Paper forwarded to Scrutinizer 2', data: paper });
  } catch (err) {
    console.error('POST /scrutinizer/papers/:id/pass-to-s2:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/scrutinizer/papers/:id/approve
// Scrutinizer 2 approves a paper — sends directly to panel
// ─────────────────────────────────────────────
router.post('/papers/:id/approve', async (req, res) => {
  const { comments } = req.body;
  try {
    const paper = await QuestionPaper.findByPk(req.params.id);
    if (!paper) return res.status(404).json({ success: false, error: 'Paper not found' });

    if (paper.status !== 'with_scrutinizer2') {
      return res.status(400).json({ success: false, error: `Paper must be at scrutinizer2 stage. Current: '${paper.status}'` });
    }

    await paper.update({
      status: 'with_panel',
      scrutinizer2Id: req.user.id,
      scrutinizer2Comments: comments || null,
    });

    res.json({ success: true, message: 'Paper approved by Scrutinizer 2 and sent to Panel', data: paper });
  } catch (err) {
    console.error('POST /scrutinizer/papers/:id/approve:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/scrutinizer/papers/:id/reject
// Scrutinizer 2 rejects a paper (sends back to faculty)
// ─────────────────────────────────────────────
router.post('/papers/:id/reject', async (req, res) => {
  const { comments } = req.body;
  if (!comments?.trim()) {
    return res.status(400).json({ success: false, error: 'Comments are required when rejecting a paper' });
  }
  try {
    const paper = await QuestionPaper.findByPk(req.params.id);
    if (!paper) return res.status(404).json({ success: false, error: 'Paper not found' });

    if (!['with_scrutinizer1', 'with_scrutinizer2'].includes(paper.status)) {
      return res.status(400).json({ success: false, error: `Paper cannot be rejected at stage '${paper.status}'` });
    }

    await paper.update({
      status: 'needs_revision',
      scrutinizer2Id: req.user.id,
      scrutinizer2Comments: comments,
      revisionCount: (paper.revisionCount || 0) + 1,
    });

    res.json({ success: true, message: 'Paper sent back to faculty for revision', data: paper });
  } catch (err) {
    console.error('POST /scrutinizer/papers/:id/reject:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/scrutinizer/papers/:id/send-to-panel
// Send a randomized paper to the panel
// ─────────────────────────────────────────────
router.post('/papers/:id/send-to-panel', async (req, res) => {
  try {
    const paper = await QuestionPaper.findByPk(req.params.id);
    if (!paper) return res.status(404).json({ success: false, error: 'Paper not found' });

    if (!['randomized', 'scrutinizer2_approved'].includes(paper.status)) {
      return res.status(400).json({ success: false, error: `Paper must be randomized or S2-approved to send to panel. Current: '${paper.status}'` });
    }

    await paper.update({ status: 'with_panel' });

    res.json({ success: true, message: 'Paper sent to panel', data: paper });
  } catch (err) {
    console.error('POST /scrutinizer/papers/:id/send-to-panel:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/scrutinizer/randomize/:courseId
// Shuffle questions across all S2-approved papers for a course.
// For each question slot, randomly pick one question from the
// same slot across all available papers → build one final QP
// → save it as a new QuestionPaper with status 'with_panel'
// ─────────────────────────────────────────────
router.post('/randomize/:courseId', async (req, res) => {
  const { courseId } = req.params;
  try {
    // 1. Fetch all S2-approved papers for this course, with their questions
    const papers = await QuestionPaper.findAll({
      where: { status: 'with_scrutinizer2', CourseId: courseId },
      include: [
        { model: Question },
        { model: Course, attributes: ['id', 'courseCode', 'courseName'] },
      ],
    });

    if (papers.length < 2) {
      return res.status(400).json({
        success: false,
        error: `Need at least 2 papers with status 'with_scrutinizer2' for this course to shuffle. Found: ${papers.length}`
      });
    }

    // 2. Group questions by part + questionNumber slot across all papers
    //    slotMap: { "A-1": [q from paper1, q from paper2, ...], "B-5": [...], ... }
    const slotMap = {};
    for (const paper of papers) {
      for (const q of (paper.Questions || [])) {
        const key = `${q.part}-${q.questionNumber}`;
        if (!slotMap[key]) slotMap[key] = [];
        slotMap[key].push(q);
      }
    }

    if (Object.keys(slotMap).length === 0) {
      return res.status(400).json({ success: false, error: 'No questions found in these papers' });
    }

    // 3. For each slot, randomly pick one question
    const pickedQuestions = Object.entries(slotMap).map(([slot, candidates]) => {
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      return {
        part: chosen.part,
        questionNumber: chosen.questionNumber,
        questionText: chosen.questionText,
        marks: chosen.marks,
        klLevel: chosen.klLevel,
        piIndicators: chosen.piIndicators || [],
        CourseOutcomeId: chosen.CourseOutcomeId,
        sourcePaperId: chosen.QuestionPaperId,
      };
    });

    // Sort by part then questionNumber for clean ordering
    pickedQuestions.sort((a, b) => {
      if (a.part !== b.part) return a.part.localeCompare(b.part);
      return a.questionNumber - b.questionNumber;
    });

    // 4. Create the new shuffled QuestionPaper
    const refPaper = papers[0];
    const shuffledPaper = await QuestionPaper.create({
      CourseId: courseId,
      examType: refPaper.examType,
      catNumber: refPaper.catNumber,
      examDate: refPaper.examDate,
      status: 'with_panel',
      createdBy: refPaper.createdBy,
      scrutinizer2Id: req.user.id,
      scrutinizer2Comments: `Shuffled from ${papers.length} papers by Scrutinizer 2`,
    });

    // 5. Bulk-create the picked questions under the new paper
    await Question.bulkCreate(
      pickedQuestions.map(q => ({
        QuestionPaperId: shuffledPaper.id,
        part: q.part,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        marks: q.marks,
        klLevel: q.klLevel,
        piIndicators: q.piIndicators,
        CourseOutcomeId: q.CourseOutcomeId,
      }))
    );

    // 6. Mark all source papers as 'randomized' so they leave the S2 queue
    await QuestionPaper.update(
      { status: 'randomized' },
      { where: { id: papers.map(p => p.id) } }
    );

    res.json({
      success: true,
      message: `Shuffled paper created from ${papers.length} papers (${pickedQuestions.length} questions) and sent to Panel`,
      shuffledPaperId: shuffledPaper.id,
      sourceCount: papers.length,
      questionCount: pickedQuestions.length,
    });

  } catch (err) {
    console.error('POST /scrutinizer/randomize/:courseId:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/scrutinizer/check-cok  (legacy)
// CO-K mapping check + store result
// ─────────────────────────────────────────────
router.post('/check-cok', async (req, res) => {
  const { paper_id, questions } = req.body;

  if (!paper_id || !questions) {
    return res.status(400).json({ success: false, error: 'paper_id and questions required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let allCorrect = true;
    const reasons = [];

    for (const q of questions) {
      const { question_id, isValid, question_no } = q;

      await client.query(
        `INSERT INTO question_reviews (paper_id, question_id, reviewer_id, reviewer_role, status, suggestion_text)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (paper_id, question_id, reviewer_role)
         DO UPDATE SET status = EXCLUDED.status, suggestion_text = EXCLUDED.suggestion_text, reviewed_at = NOW()`,
        [paper_id, question_id, req.user.id, 'scrutinizer_1', isValid ? 'APPROVED' : 'SUGGESTED', isValid ? null : 'Fix CO-K mapping']
      );

      if (!isValid) {
        allCorrect = false;
        reasons.push(`Q${question_no} invalid`);
      }
    }

    if (allCorrect) {
      await client.query(
        `UPDATE "QuestionPapers" SET status = 'with_scrutinizer2', "scrutinizer1Id" = $1 WHERE id = $2`,
        [req.user.id, paper_id]
      );
    } else {
      await client.query(
        `UPDATE "QuestionPapers" SET status = 'needs_revision', "scrutinizer1Id" = $1, "scrutinizer1Comments" = $2, "revisionCount" = "revisionCount" + 1 WHERE id = $3`,
        [req.user.id, reasons.join(', '), paper_id]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, message: allCorrect ? 'Approved and sent to Scrutinizer 2' : 'Sent back for revision' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in CO-K check:', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;