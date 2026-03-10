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