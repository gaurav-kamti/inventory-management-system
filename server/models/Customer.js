const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { validateGSTIN: serverValidateGSTIN } = require('../utils/gstValidator');

const crypto = require('crypto');

const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => crypto.randomUUID()
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: "Phone number is required"
      },
      isValidPhone(value) {
        if (!value) return;
        if (/[^\d]/.test(value)) {
          throw new Error("Phone number must contain only numeric characters");
        }
        if (value.length !== 10) {
          throw new Error("Phone number must be exactly 10 digits");
        }
      }
    }
  },
  email: {
    type: DataTypes.STRING
  },
  address: {
    type: DataTypes.TEXT
  },
  pincode: {
    type: DataTypes.STRING
  },
  gstin: {
    type: DataTypes.STRING,
    validate: {
      isValidGSTIN(value) {
        const result = serverValidateGSTIN(value);
        if (!result.isValid) {
          throw new Error(result.error);
        }
      }
    }
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
