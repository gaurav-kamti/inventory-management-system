const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SaleItem = sequelize.define('SaleItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  batchNumber: {
    type: DataTypes.STRING
  },
  serialNumber: {
    type: DataTypes.STRING
  }
});

module.exports = SaleItem;
