const mongoose = require('mongoose');
const Resource = require('../models/Resource');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/study_platform';

(async () => {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB for dedupe');

    const resources = await Resource.find({}).lean();
    console.log(`Found ${resources.length} resources`);

    const map = new Map();
    const toDelete = [];

    for (const r of resources) {
      const titleKey = (r.title || '').trim().toLowerCase();
      const urlKey = r.type === 'pdf' ? '' : (r.url || '').trim();
      const key = `${r.uploadedBy}:${titleKey}:${r.subject}:${r.type}:${urlKey}`;

      if (!map.has(key)) {
        map.set(key, r);
      } else {
        const existing = map.get(key);
        // keep the earliest createdAt (or existing), delete the later one
        const existingDate = new Date(existing.createdAt || 0).getTime();
        const thisDate = new Date(r.createdAt || 0).getTime();

        if (thisDate < existingDate) {
          // mark existing for deletion, keep this
          toDelete.push(existing);
          map.set(key, r);
        } else {
          toDelete.push(r);
        }
      }
    }

    console.log(`Duplicates to delete: ${toDelete.length}`);

    for (const d of toDelete) {
      try {
        // remove cloudinary asset if present
        if (d.cloudinaryId) {
          try {
            await cloudinary.uploader.destroy(d.cloudinaryId, { resource_type: 'raw' });
            console.log(`Deleted cloudinary asset ${d.cloudinaryId}`);
          } catch (ce) {
            console.warn('Cloudinary delete failed for', d.cloudinaryId, ce.message);
          }
        }

        // remove local file if exists
        const uploadsSegment = '/uploads/resources/';
        if (d.url && d.url.includes(uploadsSegment)) {
          const parts = d.url.split(uploadsSegment);
          const filename = parts[1];
          const filePath = path.join(__dirname, '..', 'uploads', 'resources', filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('Deleted local file', filePath);
          }
        }

        await Resource.findByIdAndDelete(d._id);
        console.log('Deleted duplicate resource', d._id);
      } catch (err) {
        console.error('Failed to delete duplicate resource', d._id, err.message);
      }
    }

    // Ensure unique index exists
    try {
      await Resource.collection.createIndex({ uploadedBy: 1, title: 1, subject: 1, type: 1 }, { unique: true });
      console.log('Created unique index on uploadedBy+title+subject+type');
    } catch (ixErr) {
      console.error('Failed creating unique index:', ixErr.message);
    }

    console.log('Dedupe script finished');
    process.exit(0);
  } catch (err) {
    console.error('Dedupe script error:', err);
    process.exit(1);
  }
})();
