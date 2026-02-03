const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const QuestionPaper = require('./QuestionPaper');
const CourseOutcome = require('./CourseOutcome');

const Question = sequelize.define('Question', {
  part: {
    type: DataTypes.STRING,  // A, B, C
    allowNull: false
  },
  questionNumber: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  questionText: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  marks: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  klLevel: {
    type: DataTypes.STRING,  // K1, K2, K3, K4, K5, K6
    allowNull: false
  },
  piIndicators: {
    type: DataTypes.ARRAY(DataTypes.STRING),  // Program Indicators
    defaultValue: []
  }
});

// Relationships
Question.belongsTo(QuestionPaper);
QuestionPaper.hasMany(Question);

Question.belongsTo(CourseOutcome);
CourseOutcome.hasMany(Question);

module.exports = Question;