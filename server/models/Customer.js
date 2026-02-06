const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING
  },
  address: {
    type: DataTypes.TEXT
  },
  pinCode: {
    type: DataTypes.STRING
  },
  gstNumber: {
    type: DataTypes.STRING
  },
  state: {
    type: DataTypes.STRING,
    defaultValue: 'West Bengal'
  },
  stateCode: {
    type: DataTypes.STRING,
    defaultValue: '19'
  },
  outstandingBalance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  }
});

module.exports = Customer;
