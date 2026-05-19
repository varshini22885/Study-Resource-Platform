const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allow only PDF files for documents
  if (file.fieldname === 'file' && file.mimetype === 'application/pdf') {
    cb(null, true);
  } else if (file.fieldname === 'file') {
    cb(new Error('Only PDF files are allowed'), false);
  } else {
    cb(null, true);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

module.exports = upload;
