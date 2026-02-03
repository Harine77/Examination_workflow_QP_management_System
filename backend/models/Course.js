const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Course = sequelize.define('Course', {
  courseCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  courseName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  semester: {
    type: DataTypes.INTEGER
  },
  syllabus: {
    type: DataTypes.TEXT  // Store syllabus content
  }
});

module.exports = Course;