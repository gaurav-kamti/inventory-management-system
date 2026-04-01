const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SaleItem = sequelize.define('SaleItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  purchasePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0
  },
  saleId: {
    type: DataTypes.INTEGER,
    references: { model: 'Sales', key: 'id' }
  },
  productId: {
    type: DataTypes.INTEGER,
    references: { model: 'Products', key: 'id' }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  hsn: {
    type: DataTypes.STRING,
    defaultValue: '8301'
  },
  gst: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 18.00
  },
  discount: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  size: {
    type: DataTypes.STRING,
    allowNull: true
  },
  sizeUnit: {
    type: DataTypes.STRING,
    defaultValue: 'mm'
  },
  quantityUnit: {
    type: DataTypes.STRING,
    defaultValue: 'Pcs'
  }
});

module.exports = SaleItem;
