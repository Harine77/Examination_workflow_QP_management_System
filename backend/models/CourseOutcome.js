const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Course = require('./Course');

const CourseOutcome = sequelize.define('CourseOutcome', {
  coNumber: {
    type: DataTypes.STRING,  // CO1, CO2, CO3, etc.
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  keywords: {
    type: DataTypes.ARRAY(DataTypes.STRING),  // Topics for AI matching
    defaultValue: []
  }
});

// Relationship: Each CO belongs to a Course
CourseOutcome.belongsTo(Course);
Course.hasMany(CourseOutcome);

module.exports = CourseOutcome;