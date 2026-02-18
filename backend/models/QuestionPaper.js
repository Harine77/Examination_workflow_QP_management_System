const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Course = require('./Course');

const QuestionPaper = sequelize.define('QuestionPaper', {
  examType: {
    type: DataTypes.ENUM('CAT', 'SAT', 'SEM'),
    allowNull: false
  },
  catNumber: {
    type: DataTypes.STRING  // CAT-I, CAT-II, CAT-III
  },
  examDate: {
    type: DataTypes.DATE
  },
  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'reviewed', 'finalized'),
    defaultValue: 'draft'
  },
  // Track who created the question paper
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  // Track who reviewed the question paper
  reviewedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  // Track who finalized the question paper
  finalizedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  // Review comments from scrutinizer
  reviewComments: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Finalization notes from HOD
  finalizationNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

// Relationship: Each paper belongs to a Course
QuestionPaper.belongsTo(Course);
Course.hasMany(QuestionPaper);

// Note: User relationships will be defined in server.js after all models are loaded

module.exports = QuestionPaper;