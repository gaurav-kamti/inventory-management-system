const fs = require('fs');
const { User } = require('./server/models');

async function fix() {
  let log = 'Fix process started\n';
  try {
    const users = await User.findAll();
    log += `Found ${users.length} users\n`;
    users.forEach(u => {
      log += `- User: ${u.username}, Role: ${u.role}\n`;
    });

    const admin = await User.findOne({ where: { username: 'admin' } });
    if (!admin) {
      log += 'Admin user not found. Creating...\n';
      await User.create({
        username: 'admin',
        password: 'admin123',
        role: 'admin'
      });
      log += 'Admin user created successfully.\n';
    } else {
      log += 'Admin user found. Resetting password...\n';
      admin.password = 'admin123';
      await admin.save();
      log += 'Admin password reset to admin123.\n';
    }
  } catch (error) {
    log += `Error during fix: ${error.message}\n`;
  }
  fs.writeFileSync('fix_log.txt', log);
  process.exit();
}

fix();
