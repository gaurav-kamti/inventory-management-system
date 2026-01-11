const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CreditTransaction = sequelize.define('CreditTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  customerId: {
    type: DataTypes.INTEGER,
    references: { model: 'Customers', key: 'id' }
  },
  saleId: {
    type: DataTypes.INTEGER,
    references: { model: 'Sales', key: 'id' }
  },
  type: {
    type: DataTypes.ENUM('credit', 'payment'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT
  }
});

module.exports = CreditTransaction;
