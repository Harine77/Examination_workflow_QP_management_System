const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Course = require('./Course');

const QuestionPaper = sequelize.define('QuestionPaper', {
  examType: {
    type: DataTypes.ENUM('CAT', 'SAT', 'SEM'),  // Exam format
    allowNull: false
  },
  catNumber: {
    type: DataTypes.STRING  // CAT-I, CAT-II, CAT-III
  },
  examDate: {
    type: DataTypes.DATE
  },
  status: {
    type: DataTypes.ENUM('draft', 'completed'),
    defaultValue: 'draft'
  }
});

// Relationship: Each paper belongs to a Course
QuestionPaper.belongsTo(Course);
Course.hasMany(QuestionPaper);

module.exports = QuestionPaper;