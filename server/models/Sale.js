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
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'completed'
  },
  roundOff: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  notes: {
    type: DataTypes.TEXT
  },
  deliveryNote: {
    type: DataTypes.STRING
  },
  paymentTerms: {
    type: DataTypes.STRING
  },
  supplierRef: {
    type: DataTypes.STRING
  },
  buyerOrderNo: {
    type: DataTypes.STRING
  },
  buyerOrderDate: {
    type: DataTypes.DATEONLY
  },
  despatchedThrough: {
    type: DataTypes.STRING
  },
  termsOfDelivery: {
    type: DataTypes.TEXT
  },
  cgst: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  sgst: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  igst: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  }
});


module.exports = Sale;
