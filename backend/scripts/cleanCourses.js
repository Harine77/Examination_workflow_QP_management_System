require('dotenv').config();
const sequelize = require('../config/database');
const Course = require('../models/Course');
const CourseOutcome = require('../models/CourseOutcome');

// Keep only these course codes
const KEEP = ['UIT2504', 'UIT2601', 'UIT2602', 'UIT2603', 'UIT2604', 'UIT2605', 'UIT2606', 'UIT2607', 'UIT2608'];

async function clean() {
  await sequelize.authenticate();
  const all = await Course.findAll();
  for (const c of all) {
    if (!KEEP.includes(c.courseCode)) {
      await CourseOutcome.destroy({ where: { CourseId: c.id } });
      await c.destroy();
      console.log(`Deleted: ${c.courseCode} — ${c.courseName}`);
    } else {
      console.log(`Kept: ${c.courseCode} — ${c.courseName}`);
    }
  }
  console.log('Done!');
  process.exit(0);
}

clean().catch(e => { console.error(e.message); process.exit(1); });
