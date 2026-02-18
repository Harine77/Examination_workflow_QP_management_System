// routes/scrutinizerRoutes.js
// SIMPLE VERSION - uses raw SQL for everything

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Use same DB config as your Sequelize
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'exam_workflow',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.DB_PASS || 'password',
});

// ── CHANGE THIS IF YOUR TABLE HAS A DIFFERENT NAME ──
const QP_TABLE = 'question_papers';  // ← Change to 'QuestionPapers' or 'Questions' if needed

// ─── Helper: classify paper ───────────────────────────────────────────────────
async function classifyPaper(paperTitle) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Count distinct question_nos for THIS paper specifically
    const { rows: [{ total }] } = await client.query(
      `SELECT COUNT(DISTINCT question_no)::int AS total 
       FROM ${QP_TABLE} 
       WHERE paper_title = $1`,
      [paperTitle]
    );

    if (total === 0) {
      await client.query('ROLLBACK');
      return { status: 'PENDING', progress: { total: 0, approved: 0, suggested: 0, reviewed: 0 } };
    }

    // Get review counts, making sure we only count reviews for question_nos that exist in the paper
    const { rows: [counts] } = await client.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN qr.status = 'APPROVED' THEN 1 ELSE 0 END), 0)::int AS approved,
         COALESCE(SUM(CASE WHEN qr.status = 'SUGGESTED' THEN 1 ELSE 0 END), 0)::int AS suggested
       FROM (SELECT DISTINCT question_no FROM ${QP_TABLE} WHERE paper_title = $1) qp
       LEFT JOIN question_reviews qr 
         ON qr.question_no = qp.question_no AND qr.paper_title = $1`,
      [paperTitle]
    );

    const { approved, suggested } = counts;
    const reviewed = approved + suggested;

    console.log(`[classifyPaper] "${paperTitle}" → total=${total}, approved=${approved}, suggested=${suggested}, reviewed=${reviewed}`);

    if (approved === total) {
      // ALL questions approved
      const insertResult = await client.query(
        `INSERT INTO approved_papers (paper_title, approved_at)
         VALUES ($1, NOW()) 
         ON CONFLICT (paper_title) DO UPDATE SET approved_at = NOW()
         RETURNING *`,
        [paperTitle]
      );
      console.log(`[classifyPaper] Inserted into approved_papers:`, insertResult.rows[0]);

      await client.query(`DELETE FROM unapproved_papers WHERE paper_title = $1`, [paperTitle]);
      await client.query('COMMIT');
      return { status: 'APPROVED', progress: { total, approved, suggested, reviewed } };

    } else if (suggested > 0) {
      // Has suggestions → needs revision
      const { rows: suggestions } = await client.query(
        `SELECT question_no, suggestion_text FROM question_reviews
         WHERE paper_title = $1 AND status = 'SUGGESTED'`,
        [paperTitle]
      );
      const reason = suggestions
        .map(r => `Q${r.question_no}: ${r.suggestion_text || 'revision needed'}`)
        .join(' | ');

      await client.query(
        `INSERT INTO unapproved_papers (paper_title, reason, updated_at)
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (paper_title) DO UPDATE SET reason = $2, updated_at = NOW()`,
        [paperTitle, reason]
      );
      await client.query(`DELETE FROM approved_papers WHERE paper_title = $1`, [paperTitle]);
      await client.query('COMMIT');
      return { status: 'NEEDS_REVISION', progress: { total, approved, suggested, reviewed } };

    } else if (reviewed > 0) {
      // Partially reviewed
      await client.query(`DELETE FROM approved_papers WHERE paper_title = $1`, [paperTitle]);
      await client.query(`DELETE FROM unapproved_papers WHERE paper_title = $1`, [paperTitle]);
      await client.query('COMMIT');
      return { status: 'IN_PROGRESS', progress: { total, approved, suggested, reviewed } };

    } else {
      await client.query('COMMIT');
      return { status: 'PENDING', progress: { total, approved: 0, suggested: 0, reviewed: 0 } };
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[classifyPaper] ERROR for "${paperTitle}":`, err.message);
    throw err;
  } finally {
    client.release();
  }
}

// ─── GET /api/scrutinizer/papers ──────────────────────────────────────────────
router.get('/papers', async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT qp.*,
              qr.status AS review_status,
              qr.suggestion_text AS review_suggestion
       FROM ${QP_TABLE} qp
       LEFT JOIN question_reviews qr
         ON qr.paper_title = qp.paper_title AND qr.question_no = qp.question_no
       ORDER BY qp.paper_title, qp.section,
                CAST(regexp_replace(qp.question_no, '[^0-9]', '', 'g') AS INTEGER),
                qp.question_no`
    );

    const map = {};
    for (const row of rows) {
      const pt = row.paper_title;
      if (!map[pt]) map[pt] = { paper_title: pt, sections: { '2M': [], '6M': [], '12M': [] } };
      if (map[pt].sections[row.section]) {
        map[pt].sections[row.section].push({
          id: row.id,
          paper_title: row.paper_title,
          section: row.section,
          question_no: row.question_no,
          marks: row.marks,
          question: row.question,
          review_status: row.review_status || null,
          review_suggestion: row.review_suggestion || null,
        });
      }
    }

    const papers = await Promise.all(
      Object.values(map).map(async (p) => {
        const cls = await classifyPaper(p.paper_title);
        return { ...p, ...cls };
      })
    );

    res.json({ success: true, papers });
  } catch (err) {
    console.error('GET /scrutinizer/papers:', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ─── GET /api/scrutinizer/reviews ─────────────────────────────────────────────
router.get('/reviews', async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM question_reviews ORDER BY reviewed_at DESC`);
    res.json({ success: true, reviews: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/scrutinizer/review ─────────────────────────────────────────────
router.post('/review', async (req, res) => {
  const { paper_title, question_no, status, suggestion_text } = req.body;
  if (!paper_title || !question_no || !status) {
    return res.status(400).json({ success: false, error: 'Missing fields' });
  }
  if (!['APPROVED', 'SUGGESTED'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status' });
  }

  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO question_reviews (paper_title, question_no, status, suggestion_text)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (paper_title, question_no)
       DO UPDATE SET status = $3, suggestion_text = $4, reviewed_at = NOW()`,
      [paper_title, question_no, status, suggestion_text || null]
    );

    const paperStatus = await classifyPaper(paper_title);
    res.json({ success: true, paperStatus });
  } catch (err) {
    console.error('POST /scrutinizer/review:', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ─── POST /api/scrutinizer/review/bulk ────────────────────────────────────────
router.post('/review/bulk', async (req, res) => {
  const { paper_title, status } = req.body;
  if (!paper_title || !status) {
    return res.status(400).json({ success: false, error: 'Missing fields' });
  }

  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT DISTINCT question_no FROM ${QP_TABLE} WHERE paper_title = $1`,
      [paper_title]
    );

    for (const { question_no } of rows) {
      await client.query(
        `INSERT INTO question_reviews (paper_title, question_no, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (paper_title, question_no)
         DO UPDATE SET status = $3, suggestion_text = NULL, reviewed_at = NOW()`,
        [paper_title, question_no, status]
      );
    }

    const paperStatus = await classifyPaper(paper_title);
    res.json({ success: true, paperStatus, updated: rows.length });
  } catch (err) {
    console.error('POST /scrutinizer/review/bulk:', err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ─── GET /api/scrutinizer/status ──────────────────────────────────────────────
router.get('/status', async (req, res) => {
  try {
    const [appr, unappr, all] = await Promise.all([
      pool.query(`SELECT * FROM approved_papers ORDER BY approved_at DESC`),
      pool.query(`SELECT * FROM unapproved_papers ORDER BY updated_at DESC`),
      pool.query(`SELECT DISTINCT paper_title FROM ${QP_TABLE}`),
    ]);

    const classified = new Set([...appr.rows.map(r => r.paper_title), ...unappr.rows.map(r => r.paper_title)]);
    const pending = all.rows.map(r => r.paper_title).filter(t => !classified.has(t));

    res.json({
      success: true,
      approved: appr.rows,
      unapproved: unappr.rows,
      pending,
      summary: {
        total: all.rows.length,
        approved: appr.rows.length,
        unapproved: unappr.rows.length,
        pending: pending.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;