const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SupplierTransaction = sequelize.define('SupplierTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  supplierId: {
    type: DataTypes.INTEGER,
    references: { model: 'Suppliers', key: 'id' }
  },
  purchaseId: {
    type: DataTypes.INTEGER,
    references: { model: 'Purchases', key: 'id' },
    allowNull: true // Null for direct payments
  },
  type: {
    type: DataTypes.STRING, // Changed from ENUM for flexibility ('bill', 'payment')
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  paymentMode: {
    type: DataTypes.STRING, // Changed from ENUM ('cash', etc.)
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT
  },
  method: {
    type: DataTypes.STRING,
    defaultValue: 'On Account'
  },
  amountPaid: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  amountDue: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending' // pending, partial, completed
  },
  invoiceNumber: {
    type: DataTypes.STRING,
    allowNull: true
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

module.exports = SupplierTransaction;
