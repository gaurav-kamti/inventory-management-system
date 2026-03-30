const fs = require('fs');
const { Sequelize, DataTypes } = require("sequelize");
const bcrypt = require("bcrypt");

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./database.sqlite",
  logging: false,
});

async function fix() {
  let log = 'Fix process started (direct)\n';
  try {
    const User = sequelize.define('User', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      username: { type: DataTypes.STRING, unique: true, allowNull: false },
      password: { type: DataTypes.STRING, allowNull: false },
      role: { type: DataTypes.STRING, defaultValue: 'staff' }
    });

    await sequelize.sync();
    
    log += 'Looking for admin user...\n';
    let admin = await User.findOne({ where: { username: 'admin' } });
    if (!admin) {
      log += 'Admin user not found. Creating...\n';
      const hashedPassword = await bcrypt.hash('admin123', 10);
      admin = await User.create({
        username: 'admin',
        password: hashedPassword,
        role: 'admin'
      });
      log += 'Admin user created successfully.\n';
    } else {
      log += 'Admin user found. Resetting password...\n';
      admin.password = await bcrypt.hash('admin123', 10);
      await admin.save();
      log += 'Admin password reset to admin123.\n';
    }
    
    const count = await User.count();
    log += `Total users: ${count}\n`;
  } catch (error) {
    log += `Error during fix: ${error.message}\n${error.stack}\n`;
  }
  fs.writeFileSync('fix_log_root.txt', log);
  console.log('Fix script finished. Check fix_log_root.txt');
  process.exit();
}

fix();
