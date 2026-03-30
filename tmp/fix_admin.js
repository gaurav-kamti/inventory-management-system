const { User } = require('./server/models');
const bcrypt = require('bcrypt');

async function fix() {
  try {
    const admin = await User.findOne({ where: { username: 'admin' } });
    if (!admin) {
      console.log('Admin user not found. Creating...');
      await User.create({
        username: 'admin',
        password: 'admin123',
        role: 'admin'
      });
      console.log('Admin user created successfully.');
    } else {
      console.log('Admin user found. Resetting password...');
      admin.password = 'admin123';
      await admin.save();
      console.log('Admin password reset to admin123.');
    }
  } catch (error) {
    console.error('Error during fix:', error);
  } finally {
    process.exit();
  }
}

fix();
