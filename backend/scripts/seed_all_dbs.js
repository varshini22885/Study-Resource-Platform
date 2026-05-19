const mongoose = require('mongoose');
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

// Simple User schema definition for ad-hoc connections
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user' },
  isVerified: { type: Boolean, default: false }
});

console.log(`🔌 Connecting to MongoDB cluster to list all databases...`);
// Connect to standard admin or default
mongoose.connect(dbUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('✅ Connected successfully.');
    
    // List all databases in the cluster
    const adminDb = mongoose.connection.db.admin();
    const dbList = await adminDb.listDatabases();
    const dbNames = dbList.databases
      .map(db => db.name)
      .filter(name => !['admin', 'local', 'config'].includes(name)); // skip system dbs
    
    console.log(`📂 Found databases:`, dbNames);
    
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    // Create admin user in each database
    for (const dbName of dbNames) {
      console.log(`----------------------------------------`);
      console.log(`⚙️ Seeding database: '${dbName}'...`);
      
      // Create a separate connection to this specific database
      // Parse base uri
      const baseUri = dbUri.split('?')[0];
      const queryParams = dbUri.includes('?') ? '?' + dbUri.split('?')[1] : '';
      
      // Replace or insert database name in URI
      let targetUri;
      if (baseUri.includes('.net/')) {
        const parts = baseUri.split('.net/');
        targetUri = `${parts[0]}.net/${dbName}${queryParams}`;
      } else {
        // Fallback or simpler split
        targetUri = dbUri;
      }
      
      const conn = await mongoose.createConnection(targetUri, { useNewUrlParser: true, useUnifiedTopology: true });
      const TempUser = conn.model('User', userSchema);
      
      const existingUser = await TempUser.findOne({ email: adminEmail });
      if (existingUser) {
        console.log(`  🔍 Admin already exists in '${dbName}'. Resetting role and password...`);
        existingUser.role = 'admin';
        existingUser.password = hashedPassword;
        existingUser.isVerified = true;
        await existingUser.save();
      } else {
        console.log(`  👤 Creating Admin user in '${dbName}'...`);
        await TempUser.create({
          name: 'Administrator',
          email: adminEmail,
          password: hashedPassword,
          role: 'admin',
          isVerified: true
        });
      }
      
      await conn.close();
      console.log(`  ✅ Done with '${dbName}'.`);
    }
    
    console.log(`----------------------------------------`);
    console.log(`🎉 Master seeding complete! Admin created in all databases.`);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error in master seeding script:', err);
    process.exit(1);
  });
