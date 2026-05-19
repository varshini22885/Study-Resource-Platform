const mongoose = require('mongoose');

(async()=>{
  await mongoose.connect('mongodb://localhost:27017/study_platform');
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({email: {$regex: 'smoke.*admin', $options: 'i'}}).toArray();
  console.log('Users with smoke-admin emails:');
  users.forEach(u => console.log({id: u._id, email: u.email, role: u.role}));
  await mongoose.disconnect();
})();
