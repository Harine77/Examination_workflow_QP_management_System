require('dotenv').config();
const sequelize = require('../config/database');
const Course = require('../models/Course');

const FIXES = {
  'UIT2601': { courseName: 'Data Structures and Algorithms', semester: 3 },
  'UIT2602': { courseName: 'Database Management Systems', semester: 4 },
  'UIT2603': { courseName: 'Operating Systems', semester: 4 },
  'UIT2604': { courseName: 'Computer Networks', semester: 5 },
  'UIT2605': { courseName: 'Software Engineering', semester: 5 },
  'UIT2606': { courseName: 'Machine Learning', semester: 6 },
  'UIT2607': { courseName: 'Web Technologies', semester: 3 },
  'UIT2608': { courseName: 'Theory of Computation', semester: 4 },
};

async function fix() {
  await sequelize.authenticate();
  for (const [code, data] of Object.entries(FIXES)) {
    const c = await Course.findOne({ where: { courseCode: code } });
    if (c) { await c.update(data); console.log(`Fixed: ${code} → ${data.courseName}`); }
  }
  console.log('Done!');
  process.exit(0);
}

fix().catch(e => { console.error(e.message); process.exit(1); });
