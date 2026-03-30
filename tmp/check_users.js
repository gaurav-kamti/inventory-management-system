const { Sequelize, DataTypes } = require("sequelize");
const bcrypt = require("bcrypt");

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite",
  logging: false,
});

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, { tableName: 'Users' });

async function check() {
  try {
    const users = await User.findAll();
    console.log('Users in database:');
    for (const u of users) {
      const match = await bcrypt.compare('admin123', u.password);
      console.log(`- ID: ${u.id}, Username: ${u.username}, Password Hash: ${u.password.substring(0, 10)}..., Is 'admin123'? ${match}`);
    }
    
    if (users.length === 0) {
      console.log('No users found in database.');
    }
  } catch (error) {
    console.error('Error during check:', error);
  } finally {
    process.exit();
  }
}

check();
