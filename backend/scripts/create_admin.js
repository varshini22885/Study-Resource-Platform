const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbUri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!dbUri) {
  console.error('❌ MongoDB URI not found in .env file.');
  process.exit(1);
}

const adminEmail = 'admin@example.com';
const adminPassword = 'TestPass123!';

console.log(`🔌 Connecting to MongoDB...`);
mongoose.connect(dbUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('✅ Connected successfully.');
    
    const existingUser = await User.findOne({ email: adminEmail });
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    if (existingUser) {
      console.log(`🔍 User '${adminEmail}' already exists. Updating role to 'admin' and resetting password...`);
      existingUser.role = 'admin';
      existingUser.password = hashedPassword;
      existingUser.isVerified = true;
      await existingUser.save();
      console.log(`🎉 Success! User '${adminEmail}' updated to Admin.`);
    } else {
      console.log(`👤 Creating new Admin user: '${adminEmail}'...`);
      await User.create({
        name: 'Administrator',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        isVerified: true
      });
      console.log(`🎉 Success! Admin user '${adminEmail}' created successfully.`);
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error creating admin user:', err);
    process.exit(1);
  });
