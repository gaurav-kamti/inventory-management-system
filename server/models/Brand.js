const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const crypto = require('crypto');

const Brand = sequelize.define('Brand', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => crypto.randomUUID()
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT
  }
});

module.exports = Brand;
