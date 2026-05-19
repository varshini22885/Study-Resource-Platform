const mongoose = require('mongoose');
const User = require('../models/User');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const email = process.argv[2];
const dbUri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!email) {
  console.error('❌ Please provide an email address as an argument.');
  console.log('Usage: node scripts/promote_admin.js user@example.com');
  process.exit(1);
}

if (!dbUri) {
  console.error('❌ MongoDB URI not found in .env file.');
  process.exit(1);
}

console.log(`🔌 Connecting to MongoDB...`);
mongoose.connect(dbUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('✅ Connected successfully.');
    console.log(`🔍 Looking for user with email: ${email}`);
    
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      process.exit(1);
    }
    
    console.log(`👤 Found user: ${user.name} (Current Role: ${user.role})`);
    
    user.role = 'admin';
    await user.save();
    
    console.log(`🎉 Success! User role updated to 'admin'.`);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error promoting user:', err);
    process.exit(1);
  });
