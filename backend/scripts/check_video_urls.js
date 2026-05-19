const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Resource = require('../models/Resource');

dotenv.config();

async function checkAllResources() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/study-platform');
    console.log('✅ MongoDB connected');

    // Get ALL resources regardless of status
    const allResources = await Resource.find({})
      .select('title type url status createdAt')
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    console.log('\n📊 ALL RESOURCES IN DATABASE:');
    console.log('================================\n');
    console.log(`Total resources: ${allResources.length}\n`);

    if (allResources.length === 0) {
      console.log('No resources found in database');
      return;
    }

    // Group by type
    const byType = {};
    allResources.forEach(res => {
      if (!byType[res.type]) byType[res.type] = [];
      byType[res.type].push(res);
    });

    console.log('BREAKDOWN BY TYPE:');
    Object.entries(byType).forEach(([type, items]) => {
      console.log(`  ${type.toUpperCase()}: ${items.length}`);
    });

    console.log('\n\n📹 VIDEO RESOURCES:');
    console.log('-------------------\n');

    if (byType['video'] && byType['video'].length > 0) {
      byType['video'].forEach((video, index) => {
        console.log(`\n${index + 1}. Title: ${video.title}`);
        console.log(`   Status: ${video.status}`);
        console.log(`   Uploaded by: ${video.uploadedBy?.name || 'Unknown'}`);
        console.log(`   Created: ${new Date(video.createdAt).toLocaleString()}`);
        console.log(`   URL: ${video.url}`);
      });
    } else {
      console.log('No video resources found');
    }

    console.log('\n================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

checkAllResources();
