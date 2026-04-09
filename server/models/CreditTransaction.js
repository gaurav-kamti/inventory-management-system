const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const crypto = require('crypto');

const CreditTransaction = sequelize.define('CreditTransaction', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => crypto.randomUUID()
  },
  customerId: {
    type: DataTypes.STRING,
    references: { model: 'Customers', key: 'id' }
  },
  saleId: {
    type: DataTypes.STRING,
    references: { model: 'Sales', key: 'id' }
  },
  type: {
    type: DataTypes.STRING, // Changed from ENUM
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT
  },
  method: {
    type: DataTypes.STRING,
    defaultValue: 'On Account'
  },
  isAdvance: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  remainingAdvance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  }
});

module.exports = CreditTransaction;
