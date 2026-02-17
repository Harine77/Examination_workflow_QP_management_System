const express  = require('express');
const router   = express.Router();
const sequelize = require('../config/database'); // reuse YOUR existing connection
const { QueryTypes } = require('sequelize');

// ─── HELPER: classify paper and write to approved/unapproved tables ───────────
async function classifyPaper(paperTitle) {
  // Total distinct questions in this paper
  const [{ total }] = await sequelize.query(
    `SELECT COUNT(DISTINCT question_no)::int AS total
     FROM question_papers WHERE paper_title = :pt`,
    { replacements: { pt: paperTitle }, type: QueryTypes.SELECT }
  );

  // Review counts
  const [{ approved, suggested }] = await sequelize.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'APPROVED')::int  AS approved,
       COUNT(*) FILTER (WHERE status = 'SUGGESTED')::int AS suggested
     FROM question_reviews WHERE paper_title = :pt`,
    { replacements: { pt: paperTitle }, type: QueryTypes.SELECT }
  );

  const reviewed = approved + suggested;

  if (reviewed === total && total > 0 && approved === total) {
    // ── ALL approved → approved_papers ──────────────────────────────────────
    await sequelize.query(
      `INSERT INTO approved_papers (paper_title)
       VALUES (:pt)
       ON CONFLICT (paper_title) DO UPDATE SET approved_at = NOW()`,
      { replacements: { pt: paperTitle }, type: QueryTypes.INSERT }
    );
    await sequelize.query(
      `DELETE FROM unapproved_papers WHERE paper_title = :pt`,
      { replacements: { pt: paperTitle }, type: QueryTypes.DELETE }
    );
    return { status: 'APPROVED', progress: { total, approved, suggested, reviewed } };

  } else if (suggested > 0) {
    // ── Has suggestions → unapproved_papers ─────────────────────────────────
    const suggestions = await sequelize.query(
      `SELECT question_no, suggestion_text FROM question_reviews
       WHERE paper_title = :pt AND status = 'SUGGESTED'`,
      { replacements: { pt: paperTitle }, type: QueryTypes.SELECT }
    );
    const reason = suggestions
      .map(r => `Q${r.question_no}: ${r.suggestion_text || 'revision needed'}`)
      .join(' | ');

    await sequelize.query(
      `INSERT INTO unapproved_papers (paper_title, reason)
       VALUES (:pt, :reason)
       ON CONFLICT (paper_title) DO UPDATE SET reason = :reason, updated_at = NOW()`,
      { replacements: { pt: paperTitle, reason }, type: QueryTypes.INSERT }
    );
    await sequelize.query(
      `DELETE FROM approved_papers WHERE paper_title = :pt`,
      { replacements: { pt: paperTitle }, type: QueryTypes.DELETE }
    );
    return { status: 'NEEDS_REVISION', progress: { total, approved, suggested, reviewed } };

  } else if (reviewed > 0) {
    // ── Partially reviewed ───────────────────────────────────────────────────
    await sequelize.query(
      `DELETE FROM approved_papers   WHERE paper_title = :pt`,
      { replacements: { pt: paperTitle }, type: QueryTypes.DELETE }
    );
    await sequelize.query(
      `DELETE FROM unapproved_papers WHERE paper_title = :pt`,
      { replacements: { pt: paperTitle }, type: QueryTypes.DELETE }
    );
    return { status: 'IN_PROGRESS', progress: { total, approved, suggested, reviewed } };

  } else {
    return { status: 'PENDING', progress: { total, approved: 0, suggested: 0, reviewed: 0 } };
  }
}

// ─── GET /api/scrutinizer/papers ──────────────────────────────────────────────
// Returns all papers from question_papers grouped by section, with review status
router.get('/papers', async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT qp.*,
              qr.status           AS review_status,
              qr.suggestion_text  AS review_suggestion
       FROM   question_papers qp
       LEFT JOIN question_reviews qr
         ON   qr.paper_title = qp.paper_title
         AND  qr.question_no  = qp.question_no
       ORDER BY qp.paper_title,
                qp.section,
                CAST(regexp_replace(qp.question_no, '[^0-9]', '', 'g') AS INTEGER),
                qp.question_no`,
      { type: QueryTypes.SELECT }
    );

    // Group into papers map
    const map = {};
    for (const row of rows) {
      const pt = row.paper_title;
      if (!map[pt]) {
        map[pt] = { paper_title: pt, sections: { '2M': [], '6M': [], '12M': [] } };
      }
      if (map[pt].sections[row.section] !== undefined) {
        map[pt].sections[row.section].push({
          id:                row.id,
          paper_title:       row.paper_title,
          section:           row.section,
          question_no:       row.question_no,
          marks:             row.marks,
          question:          row.question,
          review_status:     row.review_status    || null,
          review_suggestion: row.review_suggestion || null,
        });
      }
    }

    // Classify each paper
    const papers = await Promise.all(
      Object.values(map).map(async (p) => {
        const cls = await classifyPaper(p.paper_title);
        return { ...p, ...cls };
      })
    );

    res.json({ success: true, papers });
  } catch (err) {
    console.error('GET /scrutinizer/papers error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/scrutinizer/reviews ─────────────────────────────────────────────
router.get('/reviews', async (req, res) => {
  try {
    const reviews = await sequelize.query(
      `SELECT * FROM question_reviews ORDER BY reviewed_at DESC`,
      { type: QueryTypes.SELECT }
    );
    res.json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/scrutinizer/review ─────────────────────────────────────────────
// Upsert a single question review, then auto-classify the paper
router.post('/review', async (req, res) => {
  const { paper_title, question_no, status, suggestion_text } = req.body;

  if (!paper_title || !question_no || !status) {
    return res.status(400).json({ success: false, error: 'Missing required fields: paper_title, question_no, status' });
  }
  if (!['APPROVED', 'SUGGESTED'].includes(status)) {
    return res.status(400).json({ success: false, error: 'status must be APPROVED or SUGGESTED' });
  }

  try {
    await sequelize.query(
      `INSERT INTO question_reviews (paper_title, question_no, status, suggestion_text)
       VALUES (:pt, :qno, :status, :suggestion)
       ON CONFLICT (paper_title, question_no)
       DO UPDATE SET
         status          = :status,
         suggestion_text = :suggestion,
         reviewed_at     = NOW()`,
      {
        replacements: {
          pt:         paper_title,
          qno:        question_no,
          status,
          suggestion: suggestion_text || null,
        },
        type: QueryTypes.INSERT,
      }
    );

    const paperStatus = await classifyPaper(paper_title);
    res.json({ success: true, paperStatus });
  } catch (err) {
    console.error('POST /scrutinizer/review error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/scrutinizer/review/bulk ────────────────────────────────────────
// Approve or flag all questions in a paper at once
router.post('/review/bulk', async (req, res) => {
  const { paper_title, status } = req.body;
  if (!paper_title || !status) {
    return res.status(400).json({ success: false, error: 'Missing paper_title or status' });
  }

  try {
    const questions = await sequelize.query(
      `SELECT DISTINCT question_no FROM question_papers WHERE paper_title = :pt`,
      { replacements: { pt: paper_title }, type: QueryTypes.SELECT }
    );

    for (const { question_no } of questions) {
      await sequelize.query(
        `INSERT INTO question_reviews (paper_title, question_no, status)
         VALUES (:pt, :qno, :status)
         ON CONFLICT (paper_title, question_no)
         DO UPDATE SET status = :status, suggestion_text = NULL, reviewed_at = NOW()`,
        {
          replacements: { pt: paper_title, qno: question_no, status },
          type: QueryTypes.INSERT,
        }
      );
    }

    const paperStatus = await classifyPaper(paper_title);
    res.json({ success: true, paperStatus, updated: questions.length });
  } catch (err) {
    console.error('POST /scrutinizer/review/bulk error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/scrutinizer/status ──────────────────────────────────────────────
// Pipeline overview: approved, unapproved, pending papers
router.get('/status', async (req, res) => {
  try {
    const [approved, unapproved, all] = await Promise.all([
      sequelize.query(`SELECT * FROM approved_papers   ORDER BY approved_at DESC`, { type: QueryTypes.SELECT }),
      sequelize.query(`SELECT * FROM unapproved_papers ORDER BY updated_at  DESC`, { type: QueryTypes.SELECT }),
      sequelize.query(`SELECT DISTINCT paper_title FROM question_papers`,           { type: QueryTypes.SELECT }),
    ]);

    const classified = new Set([
      ...approved.map(r => r.paper_title),
      ...unapproved.map(r => r.paper_title),
    ]);
    const pending = all.map(r => r.paper_title).filter(t => !classified.has(t));

    res.json({
      success: true,
      approved,
      unapproved,
      pending,
      summary: {
        total:      all.length,
        approved:   approved.length,
        unapproved: unapproved.length,
        pending:    pending.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;