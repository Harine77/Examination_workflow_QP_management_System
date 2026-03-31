// routes/ScrutinizerRoutes.js
// Uses Sequelize models so it reads papers created by faculty correctly.
// Maintains the same API surface as before so the frontend keeps working.

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Pool } = require('pg');
const { protect } = require('../middleware/authMiddleware');
const QuestionPaper = require('../models/QuestionPaper');
const Question = require('../models/Question');
const Course = require('../models/Course');
const User = require('../models/user');

// ── Auth: all scrutinizer routes require a valid JWT ─────────────────────────
router.use(protect);

// Thin pg pool ONLY for the question_reviews table (created by the migration script)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'exam_workflow',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.DB_PASS || 'password',
});

// ── Helpers ───────────────────────────────────────────────────────────────────

// Roles that are allowed to access scrutinizer routes
const SCRUTINIZER_ROLES = ['scrutinizer', 'scrutinizer_1', 'scrutinizer_2'];

function requireScrutinizer(req, res, next) {
  if (!SCRUTINIZER_ROLES.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Scrutinizers only' });
  }
  next();
}

// ─── Helper: classify paper ───────────────────────────────────────────────────
async function classifyPaper(paperTitle) {
  const client = await pool.connect();
  try {
    // Total questions
    const { rows: [{ total }] } = await client.query(
      `SELECT COUNT(DISTINCT question_no)::int AS total FROM ${QP_TABLE} WHERE paper_title = $1`,
      [paperTitle]
    );

    // Reviews
    const { rows: [{ approved, suggested }] } = await client.query(
      `SELECT 
         COALESCE(COUNT(*) FILTER (WHERE status = 'APPROVED'), 0)::int AS approved,
         COALESCE(COUNT(*) FILTER (WHERE status = 'SUGGESTED'), 0)::int AS suggested
       FROM question_reviews WHERE paper_title = $1`,
      [paperTitle]
    );

    const reviewed = approved + suggested;

    if (total > 0 && reviewed === total && approved === total) {
      // All approved
      await client.query(
        `INSERT INTO approved_papers (paper_title)
         VALUES ($1) ON CONFLICT (paper_title) DO UPDATE SET approved_at = NOW()`,
        [paperTitle]
      );
      await client.query(`DELETE FROM unapproved_papers WHERE paper_title = $1`, [paperTitle]);
      return { status: 'APPROVED', progress: { total, approved, suggested, reviewed } };

    } else if (suggested > 0) {
      // Has suggestions
      const { rows: suggestions } = await client.query(
        `SELECT question_no, suggestion_text FROM question_reviews
         WHERE paper_title = $1 AND status = 'SUGGESTED'`,
        [paperTitle]
      );
      const reason = suggestions.map(r => `Q${r.question_no}: ${r.suggestion_text || 'revision needed'}`).join(' | ');

      await client.query(
        `INSERT INTO unapproved_papers (paper_title, reason)
         VALUES ($1, $2) ON CONFLICT (paper_title) DO UPDATE SET reason = $2, updated_at = NOW()`,
        [paperTitle, reason]
      );
      await client.query(`DELETE FROM approved_papers WHERE paper_title = $1`, [paperTitle]);
      return { status: 'NEEDS_REVISION', progress: { total, approved, suggested, reviewed } };

    } else if (reviewed > 0) {
      // Partially reviewed
      await client.query(`DELETE FROM approved_papers WHERE paper_title = $1`, [paperTitle]);
      await client.query(`DELETE FROM unapproved_papers WHERE paper_title = $1`, [paperTitle]);
      return { status: 'IN_PROGRESS', progress: { total, approved, suggested, reviewed } };

    } else {
      return { status: 'PENDING', progress: { total, approved: 0, suggested: 0, reviewed: 0 } };
    }
  } finally {
    client.release();
  }
}

// Which workflow stages each role should see for the GET /papers list
function getVisibleStages(role) {
  if (role === 'scrutinizer_1') return ['with_scrutinizer1'];
  if (role === 'scrutinizer_2') return ['with_scrutinizer2', 'scrutinizer2_approved', 'randomized'];
  // Generic 'scrutinizer' sees both stages (backward compat)
  return ['with_scrutinizer1', 'with_scrutinizer2', 'submitted', 'scrutinizer2_approved', 'randomized'];
}

// Compute a consistent section label from a Question row
function getSection(q) {
  if (q.part === 'A' || q.marks === 2) return '2M';
  if (q.part === 'B' || q.marks === 6) return '6M';
  return '12M';
}

// Compute a human-readable question number from part + questionNumber.
// Part A -> 1,2,3,4   Part B -> 5,6,7   Part C -> 8a,8b,9a,9b
function getQuestionNo(q) {
  if (q.part === 'A') return String(q.questionNumber);
  if (q.part === 'B') return String(q.questionNumber + 4);
  if (q.part === 'C') {
    const base = Math.floor((q.questionNumber - 1) / 2) + 8;
    const sub  = (q.questionNumber % 2 === 1) ? 'a' : 'b';
    return `${base}${sub}`;
  }
  // Fallback
  return `${q.part}${q.questionNumber}`;
}

// Build a display title for a paper
function buildDisplayTitle(paper) {
  const code = paper.Course?.courseCode || '?';
  const type = paper.examType || '';
  const cat  = paper.catNumber ? ` ${paper.catNumber}` : '';
  return `${code} ${type}${cat} #${paper.id}`;
}

// ── GET /api/scrutinizer/papers ───────────────────────────────────────────────
// Returns papers visible to the logged-in scrutinizer, formatted for the
// Scrutinizerdashboard.jsx frontend component.
router.get('/papers', requireScrutinizer, async (req, res) => {
  try {
    const stages = getVisibleStages(req.user.role);

    const dbPapers = await QuestionPaper.findAll({
      where: { status: { [Op.in]: stages } },
      include: [
        { model: Course, attributes: ['id', 'courseCode', 'courseName'] },
        { model: User, as: 'creator', attributes: ['id', 'username', 'email'] },
        { model: Question }
      ],
      order: [['createdAt', 'DESC']]
    });

    const papers = await Promise.all(dbPapers.map(async (paper) => {
      // Use paper.id as string — this is the identifier the frontend sends back
      const paperTitle = String(paper.id);

      // Sort questions: Part A < B < C, then by questionNumber
      const allQs = (paper.Questions || []).sort((a, b) => {
        const order = { A: 0, B: 1, C: 2 };
        const diff  = (order[a.part] ?? 9) - (order[b.part] ?? 9);
        return diff !== 0 ? diff : a.questionNumber - b.questionNumber;
      });

      // Fetch this scrutinizer's own reviews for this paper
      let reviewRows = [];
      try {
        const result = await pool.query(
          `SELECT question_id, status, suggestion_text
             FROM question_reviews
            WHERE paper_id = $1 AND reviewer_role = $2`,
          [paper.id, req.user.role]
        );
        reviewRows = result.rows;
      } catch (_) { /* question_reviews table may not exist yet */ }

      const reviewMap = {};
      for (const r of reviewRows) {
        reviewMap[r.question_id] = r;
      }

      // Build sections expected by the frontend
      const sections = { '2M': [], '6M': [], '12M': [] };
      for (const q of allQs) {
        const sec = getSection(q);
        const qno = getQuestionNo(q);
        const rev = reviewMap[q.id];
        if (sections[sec]) {
          sections[sec].push({
            id:               q.id,
            paper_title:      paperTitle,
            section:          sec,
            question_no:      qno,
            marks:            q.marks,
            question:         q.questionText,
            review_status:    rev?.status         || null,
            review_suggestion: rev?.suggestion_text || null,
          });
        }
      }

      // Progress counters
      const allFlat   = Object.values(sections).flat();
      const total     = allFlat.length;
      const approved  = allFlat.filter(q => q.review_status === 'APPROVED').length;
      const suggested = allFlat.filter(q => q.review_status === 'SUGGESTED').length;
      const reviewed  = approved + suggested;

      let status;
      if (approved === total && total > 0) status = 'APPROVED';
      else if (suggested > 0)              status = 'NEEDS_REVISION';
      else if (reviewed > 0)               status = 'IN_PROGRESS';
      else                                 status = 'PENDING';

      return {
        paper_title:          paperTitle,
        display_title:        buildDisplayTitle(paper),
        paper_id:             paper.id,
        workflow_status:      paper.status,
        creator:              paper.creator?.username || 'Unknown',
        status,
        sections,
        progress:             { total, approved, suggested, reviewed },
        scrutinizer1Comments: paper.scrutinizer1Comments || null,
        scrutinizer2Comments: paper.scrutinizer2Comments || null,
        revisionCount:        paper.revisionCount || 0,
      };
    }));

    res.json({ success: true, papers });
  } catch (err) {
    console.error('GET /scrutinizer/papers:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/scrutinizer/reviews ─────────────────────────────────────────────
router.get('/reviews', requireScrutinizer, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT qr.paper_id, qr.question_id, q.part, q."questionNumber",
              qr.status, qr.suggestion_text, qr.reviewed_at
         FROM question_reviews qr
         JOIN "Questions" q ON q.id = qr.question_id
        WHERE qr.reviewer_role = $1
        ORDER BY qr.reviewed_at DESC`,
      [req.user.role]
    );

    // Convert to {paper_title, question_no} format the frontend expects
    const reviews = rows.map(r => ({
      paper_title:     String(r.paper_id),
      question_no:     getQuestionNo(r),
      status:          r.status,
      suggestion_text: r.suggestion_text,
      reviewed_at:     r.reviewed_at,
    }));

    res.json({ success: true, reviews });
  } catch (err) {
    // question_reviews table may not exist yet (before migration)
    res.json({ success: true, reviews: [] });
  }
});

// ── POST /api/scrutinizer/review ─────────────────────────────────────────────
// Body: { paper_title, question_no, status, suggestion_text }
router.post('/review', requireScrutinizer, async (req, res) => {
  const { paper_title, question_no, status, suggestion_text } = req.body;

  if (!paper_title || !question_no || !status) {
    return res.status(400).json({ success: false, error: 'Missing fields: paper_title, question_no, status required' });
  }
  if (!['APPROVED', 'SUGGESTED'].includes(status)) {
    return res.status(400).json({ success: false, error: 'status must be APPROVED or SUGGESTED' });
  }

  const paperId = parseInt(paper_title, 10);
  if (isNaN(paperId)) {
    return res.status(400).json({ success: false, error: 'paper_title must be the numeric paper ID' });
  }

  try {
    const paper = await QuestionPaper.findByPk(paperId, { include: [Question] });
    if (!paper) {
      return res.status(404).json({ success: false, error: 'Paper not found' });
    }

    const targetQ = (paper.Questions || []).find(q => getQuestionNo(q) === question_no);
    if (!targetQ) {
      return res.status(404).json({ success: false, error: `Question '${question_no}' not found in paper ${paperId}` });
    }

    await pool.query(
      `INSERT INTO question_reviews
         (paper_id, question_id, reviewer_id, reviewer_role, status, suggestion_text, reviewed_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (paper_id, question_id, reviewer_role)
       DO UPDATE SET status = $5, suggestion_text = $6, reviewed_at = NOW()`,
      [paperId, targetQ.id, req.user.id, req.user.role, status, suggestion_text || null]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('POST /scrutinizer/review:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/scrutinizer/review/bulk ────────────────────────────────────────
// Body: { paper_title, status }
router.post('/review/bulk', requireScrutinizer, async (req, res) => {
  const { paper_title, status } = req.body;

  if (!paper_title || !status) {
    return res.status(400).json({ success: false, error: 'Missing fields: paper_title and status required' });
  }
  if (!['APPROVED', 'SUGGESTED'].includes(status)) {
    return res.status(400).json({ success: false, error: 'status must be APPROVED or SUGGESTED' });
  }

  const paperId = parseInt(paper_title, 10);
  if (isNaN(paperId)) {
    return res.status(400).json({ success: false, error: 'paper_title must be the numeric paper ID' });
  }

  try {
    const paper = await QuestionPaper.findByPk(paperId, { include: [Question] });
    if (!paper) {
      return res.status(404).json({ success: false, error: 'Paper not found' });
    }

    const questions = paper.Questions || [];
    for (const q of questions) {
      await pool.query(
        `INSERT INTO question_reviews
           (paper_id, question_id, reviewer_id, reviewer_role, status, suggestion_text, reviewed_at)
         VALUES ($1, $2, $3, $4, $5, NULL, NOW())
         ON CONFLICT (paper_id, question_id, reviewer_role)
         DO UPDATE SET status = $5, suggestion_text = NULL, reviewed_at = NOW()`,
        [paperId, q.id, req.user.id, req.user.role, status]
      );
    }

    res.json({ success: true, updated: questions.length });
  } catch (err) {
    console.error('POST /scrutinizer/review/bulk:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/scrutinizer/papers/:id/pass-to-s2 ──────────────────────────────
// Scrutinizer 1 finishes reviewing and hands paper to Scrutinizer 2.
// Body (optional): { comments }
router.post('/papers/:id/pass-to-s2', requireScrutinizer, async (req, res) => {
  if (!['scrutinizer', 'scrutinizer_1'].includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'Only Scrutinizer 1 can pass papers to Scrutinizer 2' });
  }
  try {
    const paper = await QuestionPaper.findByPk(req.params.id);
    if (!paper) return res.status(404).json({ success: false, error: 'Paper not found' });

    if (!['with_scrutinizer1', 'submitted'].includes(paper.status)) {
      return res.status(400).json({
        success: false,
        error: `Paper is at stage '${paper.status}'. Must be at Scrutinizer 1 to pass forward.`
      });
    }

    await paper.update({
      status:               'with_scrutinizer2',
      scrutinizer1Id:       req.user.id,
      scrutinizer1Comments: req.body.comments || null,
    });

    res.json({ success: true, message: 'Paper passed to Scrutinizer 2', data: paper });
  } catch (err) {
    console.error('POST /scrutinizer/papers/:id/pass-to-s2:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/scrutinizer/approved-papers/random-three ───────────────────────
router.get('/approved-papers/random-three', async (req, res) => {
  const client = await pool.connect();
  try {
    // Get 3 random approved papers
    const { rows: approvedList } = await client.query(
      `SELECT paper_title FROM approved_papers ORDER BY RANDOM() LIMIT 3`
    );

    if (approvedList.length < 3) {
      return res.json({
        success: false,
        error: `Only ${approvedList.length} approved paper(s) found. Need at least 3 for shuffling.`,
        papers: []
      });
    }

    // Fetch full questions for each approved paper
    const papers = await Promise.all(
      approvedList.map(async ({ paper_title }) => {
        const { rows } = await client.query(
          `SELECT * FROM ${QP_TABLE}
           WHERE paper_title = $1
           ORDER BY section,
                    CAST(regexp_replace(question_no, '[^0-9]', '', 'g') AS INTEGER),
                    question_no`,
          [paper_title]
        );

        // Group by section
        const sections = { '2M': [], '6M': [], '12M': [] };
        rows.forEach(q => {
          if (sections[q.section]) {
            sections[q.section].push({
              id: q.id,
              paper_title: q.paper_title,
              section: q.section,
              question_no: q.question_no,
              marks: q.marks,
              question: q.question
            });
          }
        });

        return { paper_title, sections };
      })
    );

    res.json({ success: true, papers });
  } catch (err) {
    console.error('GET /scrutinizer/approved-papers/random-three:', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ─── GET /api/scrutinizer/approved-papers/random-three ────────────────────────
// Returns 3 random approved papers with full question details for final paper generation
router.get('/approved-papers/random-three', async (req, res) => {
  const client = await pool.connect();
  try {
    // Get 3 random approved papers
    const { rows: approvedTitles } = await client.query(
      `SELECT paper_title FROM approved_papers ORDER BY RANDOM() LIMIT 3`
    );

    if (approvedTitles.length < 3) {
      return res.status(404).json({ 
        success: false, 
        error: `Only ${approvedTitles.length} approved papers found. Need at least 3.` 
      });
    }

    // Fetch full question details for each paper
    const papers = [];
    for (const { paper_title } of approvedTitles) {
      const { rows } = await client.query(
        `SELECT * FROM ${QP_TABLE}
         WHERE paper_title = $1
         ORDER BY section,
                  CAST(regexp_replace(question_no, '[^0-9]', '', 'g') AS INTEGER),
                  question_no`,
        [paper_title]
      );

      // Group by section
      const sections = { '2M': [], '6M': [], '12M': [] };
      for (const row of rows) {
        if (sections[row.section]) {
          sections[row.section].push({
            id: row.id,
            paper_title: row.paper_title,
            section: row.section,
            question_no: row.question_no,
            marks: row.marks,
            question: row.question,
          });
        }
      }

      papers.push({ paper_title, sections });
    }

    res.json({ success: true, papers });
  } catch (err) {
    console.error('GET /scrutinizer/approved-papers/random-three:', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ─── POST /api/scrutinizer/save-final-paper ──────────────────────────────────
router.post('/save-final-paper', async (req, res) => {
  const { final_paper_title, questions, source_papers } = req.body;

  if (!final_paper_title || !questions || !Array.isArray(questions)) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required fields: final_paper_title, questions (array)' 
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create final_paper table if doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS final_paper (
        id SERIAL PRIMARY KEY,
        final_paper_title VARCHAR(255) NOT NULL,
        section VARCHAR(10) NOT NULL,
        question_no VARCHAR(10) NOT NULL,
        marks INTEGER NOT NULL,
        question TEXT NOT NULL,
        source_paper_title VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(final_paper_title, question_no)
      )
    `);

    // Delete existing (if regenerating)
    await client.query(
      `DELETE FROM final_paper WHERE final_paper_title = $1`,
      [final_paper_title]
    );

    // Insert all questions
    for (const q of questions) {
      await client.query(
        `INSERT INTO final_paper 
         (final_paper_title, section, question_no, marks, question, source_paper_title)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          final_paper_title,
          q.section,
          q.question_no,
          q.marks,
          q.question,
          q.source_paper_title || q.paper_title
        ]
      );
    }

    // Store metadata
    await client.query(`
      CREATE TABLE IF NOT EXISTS final_paper_metadata (
        id SERIAL PRIMARY KEY,
        final_paper_title VARCHAR(255) NOT NULL UNIQUE,
        source_papers TEXT[] NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(
      `INSERT INTO final_paper_metadata (final_paper_title, source_papers)
       VALUES ($1, $2)
       ON CONFLICT (final_paper_title) 
       DO UPDATE SET source_papers = $2, created_at = NOW()`,
      [final_paper_title, source_papers || []]
    );

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      message: `Final paper saved with ${questions.length} questions`,
      final_paper_title,
      questions_count: questions.length
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /scrutinizer/save-final-paper:', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
