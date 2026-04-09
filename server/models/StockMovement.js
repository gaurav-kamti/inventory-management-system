const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const crypto = require('crypto');

const StockMovement = sequelize.define('StockMovement', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => crypto.randomUUID()
  },
  productId: {
    type: DataTypes.STRING,
    references: { model: 'Products', key: 'id' }
  },
  userId: {
    type: DataTypes.STRING,
    references: { model: 'Users', key: 'id' }
  },
  type: {
    type: DataTypes.ENUM('in', 'out', 'adjustment'),
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  previousStock: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  newStock: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT
  }
});

module.exports = StockMovement;
