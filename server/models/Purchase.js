const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Purchase = sequelize.define('Purchase', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  productId: {
    type: DataTypes.INTEGER,
    references: { model: 'Products', key: 'id' }
  },
  supplierId: {
    type: DataTypes.INTEGER,
    references: { model: 'Suppliers', key: 'id' }
  },
  invoiceNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quantityReceived: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  unitCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  landingCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  totalCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  receivedDate: {
    type: DataTypes.DATE,
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
  roundOff: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  notes: {
    type: DataTypes.TEXT
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
    defaultValue: 'pending'
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  taxableAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  gstPercent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 18
  },
  discountPercent: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  discountAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  cgst: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  sgst: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  }
});


module.exports = Purchase;
