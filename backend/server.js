const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());
require('./config/passport');

let dbError = null;

const connectionString = (process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/study_platform').trim();

// Connect to MongoDB
mongoose.connect(connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of hanging
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
  dbError = null;
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  dbError = err.message;
});

// Routes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/users', require('./routes/users'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    dbError: mongoose.connection.readyState === 1 ? null : dbError,
    envKeys: Object.keys(process.env).filter(key => key.includes('MONGO') || key.includes('URI'))
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      status: err.status || 500
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { message: 'Route not found', status: 404 } });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
