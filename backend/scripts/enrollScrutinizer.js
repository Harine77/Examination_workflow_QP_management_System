require('dotenv').config();
const sequelize = require('../config/database');
const User = require('../models/user');
const Course = require('../models/Course');

async function enroll() {
  await sequelize.authenticate();
  
  // Get all courses
  const courses = await Course.findAll({ attributes: ['id', 'courseCode'] });
  const allIds = courses.map(c => c.id);
  console.log('All course IDs:', allIds);

  // Update all scrutinizer_1 users that have no enrolled courses
  const scrutinizers = await User.findAll({ where: { role: 'scrutinizer_1' } });
  for (const s of scrutinizers) {
    if (!s.enrolledCourses || s.enrolledCourses.length === 0) {
      await s.update({ enrolledCourses: allIds });
      console.log(`Updated ${s.username} (${s.email}) with all ${allIds.length} courses`);
    } else {
      console.log(`${s.username} already has ${s.enrolledCourses.length} courses enrolled`);
    }
  }
  console.log('Done!');
  process.exit(0);
}

enroll().catch(e => { console.error(e.message); process.exit(1); });
