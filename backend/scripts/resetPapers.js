/**
 * resetPapers.js
 * Clears all question papers, questions, question_reviews, and courses
 * but keeps Users intact so you don't need to re-register.
 *
 * Run: node backend/scripts/resetPapers.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const sequelize  = require('../config/database');
const Question   = require('../models/Question');
const QuestionPaper = require('../models/QuestionPaper');
const CourseOutcome = require('../models/CourseOutcome');
const Course     = require('../models/Course');
const { Pool }   = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function reset() {
  try {
    await sequelize.authenticate();
    console.log('✅ DB connected');

    // 1. question_reviews (raw table, no Sequelize model)
    try {
      await pool.query('DELETE FROM question_reviews');
      console.log('🗑  question_reviews cleared');
    } catch (e) {
      console.log('⚠  question_reviews table not found, skipping');
    }

    // 2. Questions
    await Question.destroy({ where: {}, truncate: true, cascade: true });
    console.log('🗑  Questions cleared');

    // 3. QuestionPapers
    await QuestionPaper.destroy({ where: {}, truncate: true, cascade: true });
    console.log('🗑  QuestionPapers cleared');

    // 4. CourseOutcomes
    await CourseOutcome.destroy({ where: {}, truncate: true, cascade: true });
    console.log('🗑  CourseOutcomes cleared');

    // 5. Courses
    await Course.destroy({ where: {}, truncate: true, cascade: true });
    console.log('🗑  Courses cleared');

    console.log('\n✅ All paper data cleared. Users are untouched.');
    console.log('   You can now start fresh — create QPs from faculty accounts.\n');

  } catch (err) {
    console.error('❌ Reset failed:', err.message);
  } finally {
    await pool.end();
    await sequelize.close();
    process.exit(0);
  }
}

reset();
