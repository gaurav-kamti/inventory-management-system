const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Sale = sequelize.define('Sale', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  invoiceNumber: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  customerId: {
    type: DataTypes.INTEGER,
    references: { model: 'Customers', key: 'id' }
  },
  userId: {
    type: DataTypes.INTEGER,
    references: { model: 'Users', key: 'id' }
  },
  salesChannel: {
    type: DataTypes.ENUM('in-store', 'website', 'amazon', 'wholesale', 'other'),
    defaultValue: 'in-store'
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  tax: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  amountPaid: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  amountDue: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  paymentMode: {
    type: DataTypes.ENUM('cash', 'card', 'bank-transfer', 'credit', 'partial'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('completed', 'pending', 'cancelled'),
    defaultValue: 'completed'
  },
  customerEmail: {
    type: DataTypes.STRING
  },
  customerPhone: {
    type: DataTypes.STRING
  },
  shippingAddress: {
    type: DataTypes.TEXT
  },
  shippingMethod: {
    type: DataTypes.STRING
  },
  trackingNumber: {
    type: DataTypes.STRING
  },
  notes: {
    type: DataTypes.TEXT
  }
});

module.exports = Sale;
