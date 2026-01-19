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
  supplierPartNumber: {
    type: DataTypes.STRING
  },
  invoiceNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quantityReceived: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  unitOfMeasure: {
    type: DataTypes.STRING,
    defaultValue: 'pieces'
  },
  unitCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  shippingCost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  customsCost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  handlingCost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  landingCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  totalCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  batchNumber: {
    type: DataTypes.STRING
  },
  lotNumber: {
    type: DataTypes.STRING
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
  }
});

module.exports = Purchase;
