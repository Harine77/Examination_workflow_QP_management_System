const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BloomKeyword = sequelize.define('BloomKeyword', {
  level: {
    type: DataTypes.STRING,  // K1, K2, K3, K4, K5, K6
    allowNull: false
  },
  levelName: {
    type: DataTypes.STRING  // Remembering, Understanding, etc.
  },
  keywords: {
    type: DataTypes.ARRAY(DataTypes.STRING),  // Action verbs
    defaultValue: []
  }
});

module.exports = BloomKeyword;