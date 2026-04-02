require('dotenv').config();
const sequelize = require('../config/database');
const QuestionPaper = require('../models/QuestionPaper');
const Course = require('../models/Course');
const Question = require('../models/Question');

async function clean() {
  await sequelize.authenticate();
  
  const validCourses = await Course.findAll({ attributes: ['id'] });
  const validIds = validCourses.map(c => c.id);
  
  const papers = await QuestionPaper.findAll();
  for (const p of papers) {
    if (!validIds.includes(p.CourseId)) {
      await Question.destroy({ where: { QuestionPaperId: p.id } });
      await p.destroy();
      console.log(`Deleted orphan paper ID ${p.id} (CourseId ${p.CourseId} no longer exists)`);
    }
  }
  console.log('Done!');
  process.exit(0);
}

clean().catch(e => { console.error(e.message); process.exit(1); });
