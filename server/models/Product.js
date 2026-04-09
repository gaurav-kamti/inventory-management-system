const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const crypto = require('crypto');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => crypto.randomUUID()
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  purchasePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  sellingPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  hsn: {
    type: DataTypes.STRING,
    defaultValue: '8301'
  },
  gst: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 18.00
  },
  quantityUnit: {
    type: DataTypes.STRING,
    defaultValue: 'Pcs'
  },
  size: {
    type: DataTypes.STRING,
    allowNull: true
  },
  sizeUnit: {
    type: DataTypes.STRING,
    defaultValue: 'mm'
  }
});


module.exports = Product;
