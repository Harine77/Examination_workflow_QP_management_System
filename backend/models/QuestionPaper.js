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
  // ── Workflow status ─────────────────────────────────────────────────────
  // Full lifecycle:
  //   draft → with_scrutinizer1 → with_scrutinizer2 → needs_revision (back to faculty)
  //        → scrutinizer2_approved → randomized → with_panel → with_hod → hod_approved
  // Legacy values (submitted, reviewed, finalized) kept for backward compatibility.
  status: {
    type: DataTypes.ENUM(
      'draft',
      'submitted',            // legacy
      'with_scrutinizer1',    // faculty submitted → Scrutinizer 1 queue
      'with_scrutinizer2',    // Scrutinizer 1 passed → Scrutinizer 2 queue
      'needs_revision',       // Scrutinizer 2 rejected → back to faculty
      'scrutinizer2_approved',// Scrutinizer 2 approved this paper
      'reviewed',             // legacy
      'randomized',           // selected as the final combined paper
      'finalized',            // legacy
      'with_panel',           // sent to Panel Member
      'with_hod',             // Panel Member approved → HOD queue
      'hod_approved'          // HOD gave final sign-off
    ),
    defaultValue: 'draft'
  },

  // ── Ownership / stage-tracking FKs ─────────────────────────────────────
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' }
  },
  reviewedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' }
  },
  finalizedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' }
  },
  // ID of the Scrutinizer 1 who reviewed this paper
  scrutinizer1Id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' }
  },
  // ID of the Scrutinizer 2 who reviewed this paper
  scrutinizer2Id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' }
  },
  // ID of the Panel Member who reviewed the final paper
  panelMemberId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' }
  },

  // ── Comments at each stage ──────────────────────────────────────────────
  // Comments left by Scrutinizer 1 when passing to Scrutinizer 2
  scrutinizer1Comments: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Comments left by Scrutinizer 2 when rejecting or approving
  scrutinizer2Comments: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Generic review/finalization notes (backward compat)
  reviewComments: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  finalizationNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // How many times the paper has been sent back to faculty for revision
  revisionCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },

  // ID of the HOD who gave final approval
  hodId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Users', key: 'id' }
  },
  
  // Comments from Panel Member
  panelMemberComments: {
    type: DataTypes.TEXT,
    allowNull: true
  },

  // Comments from HOD
  hodComments: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

// Relationship: Each paper belongs to a Course
QuestionPaper.belongsTo(Course);
Course.hasMany(QuestionPaper);

// Note: User relationships will be defined in server.js after all models are loaded

module.exports = QuestionPaper;