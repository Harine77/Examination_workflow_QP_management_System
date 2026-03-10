const { QueryTypes } = require('sequelize');
const { sequelize, Question } = require('../models');

async function classifyPaper(paperTitle) {

  // Total questions
  const total = await Question.count({
    where: { paper_title: paperTitle }
  });

  // Count approved & suggested
  const counts = await sequelize.query(
    `
    SELECT 
      COUNT(*) FILTER (WHERE status = 'APPROVED') AS approved,
      COUNT(*) FILTER (WHERE status = 'SUGGESTED') AS suggested
    FROM question_reviews
    WHERE paper_title = :pt
    `,
    {
      replacements: { pt: paperTitle },
      type: QueryTypes.SELECT
    }
  );

  const approved = Number(counts[0].approved) || 0;
  const suggested = Number(counts[0].suggested) || 0;
  const reviewed = approved + suggested;

  // ✅ ALL APPROVED
  if (total > 0 && reviewed === total && approved === total) {

    await sequelize.query(
      `
      INSERT INTO approved_papers (paper_title)
      VALUES (:pt)
      ON CONFLICT (paper_title)
      DO UPDATE SET approved_at = NOW()
      `,
      { replacements: { pt: paperTitle } }
    );

    await sequelize.query(
      `DELETE FROM unapproved_papers WHERE paper_title = :pt`,
      { replacements: { pt: paperTitle } }
    );

    return { status: 'APPROVED' };
  }

  // ❌ HAS SUGGESTIONS
  if (suggested > 0) {

    const suggestions = await sequelize.query(
      `
      SELECT question_no, suggestion_text
      FROM question_reviews
      WHERE paper_title = :pt
        AND status = 'SUGGESTED'
      `,
      {
        replacements: { pt: paperTitle },
        type: QueryTypes.SELECT
      }
    );

    const reason = suggestions
      .map(s => `Q${s.question_no}: ${s.suggestion_text}`)
      .join(' | ');

    await sequelize.query(
      `
      INSERT INTO unapproved_papers (paper_title, reason)
      VALUES (:pt, :reason)
      ON CONFLICT (paper_title)
      DO UPDATE SET reason = :reason, updated_at = NOW()
      `,
      {
        replacements: { pt: paperTitle, reason }
      }
    );

    await sequelize.query(
      `DELETE FROM approved_papers WHERE paper_title = :pt`,
      { replacements: { pt: paperTitle } }
    );

    return { status: 'NEEDS_REVISION' };
  }

  // Partial review
  if (reviewed > 0) {

    await sequelize.query(
      `DELETE FROM approved_papers WHERE paper_title = :pt`,
      { replacements: { pt: paperTitle } }
    );

    await sequelize.query(
      `DELETE FROM unapproved_papers WHERE paper_title = :pt`,
      { replacements: { pt: paperTitle } }
    );

    return { status: 'IN_PROGRESS' };
  }

  return { status: 'PENDING' };
}

module.exports = classifyPaper;
