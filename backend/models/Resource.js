const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  subject: {
    type: String,
    required: true,
    default: 'Other'
  },
  type: {
    type: String,
    enum: ['pdf', 'video', 'link'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  fileSize: {
    type: String,
    default: null
  },
  cloudinaryId: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for faster queries
resourceSchema.index({ uploadedBy: 1, status: 1 });
resourceSchema.index({ subject: 1, status: 1 });
resourceSchema.index({ status: 1 });

// Prevent duplicate uploads from the same user (title+subject+type)
// This helps avoid race-condition double-inserts at the DB level.
resourceSchema.index({ uploadedBy: 1, title: 1, subject: 1, type: 1 }, { unique: true });

// Update the updatedAt field before saving
resourceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Resource', resourceSchema);
