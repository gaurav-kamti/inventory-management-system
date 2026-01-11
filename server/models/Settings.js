const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Settings = sequelize.define('Settings', {
    key: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        primaryKey: true
    },
    value: {
        type: DataTypes.JSON, // Store flexible JSON data
        allowNull: false
    }
});

module.exports = Settings;
