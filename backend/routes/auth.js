const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const validator = require('validator');

function getFrontendBaseUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:3000';
}

function getDashboardRedirectUrl() {
  return process.env.POST_LOGIN_REDIRECT_URL || `${getFrontendBaseUrl()}/dashboard.html`;
}

function getRoleBasedRedirectUrl(role) {
  const baseUrl = getDashboardRedirectUrl();
  if (role === 'admin') {
    return `${baseUrl}?tab=resources`;
  }

  return `${baseUrl}?tab=overview`;
}

function normalizeEmail(email) {
  return validator.normalizeEmail(String(email || '').trim(), {
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
    all_lowercase: true
  }) || '';
}

function validatePassword(password) {
  return typeof password === 'string' && password.trim().length >= 8;
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const userObject = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete userObject.password;
  return userObject;
}

function createSessionAndRedirect(req, res, user) {
  req.login(user, (err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'Unable to create session',
          details: err.message,
          status: 500
        }
      });
    }

    return res.json({
      success: true,
      message: 'Authentication successful',
      user: sanitizeUser(user),
      redirectUrl: getRoleBasedRedirectUrl(user.role)
    });
  });
}

/**
 * Check whether an email exists
 */
router.post('/check-email', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Please provide a valid email address',
          status: 400
        }
      });
    }

    const user = await User.findOne({ email }).select('email name role');

    return res.json({
      success: true,
      exists: !!user,
      email,
      user: user ? { name: user.name, email: user.email, role: user.role } : null
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        message: 'Error checking email',
        details: error.message,
        status: 500
      }
    });
  }
});

/**
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    const name = String(req.body.name || '').trim();

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide a valid email address', status: 400 }
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Password must be at least 8 characters long', status: 400 }
      });
    }

    if (name && name.length > 100) {
      return res.status(400).json({
        success: false,
        error: { message: 'Name is too long', status: 400 }
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { message: 'An account with this email already exists', status: 409 }
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name || email.split('@')[0],
      email,
      password: hashedPassword,
      role: 'user',
      isVerified: true
    });

    return createSessionAndRedirect(req, res, user);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        message: 'Error creating account',
        details: error.message,
        status: 500
      }
    });
  }
});

/**
 * Log in an existing user
 */
router.post('/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    console.log('[LOGIN] Input email:', req.body.email, '-> normalized:', email);
    const password = String(req.body.password || '');

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide a valid email address', status: 400 }
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Password is required', status: 400 }
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.password) {
      return res.status(404).json({
        success: false,
        error: { message: 'Account not found', status: 404 }
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { message: 'Incorrect password', status: 401 }
      });
    }

    // Re-fetch user from DB to ensure we have the latest role and other fields
    const freshUser = await User.findById(user._id);
    if (!freshUser) {
      return res.status(404).json({
        success: false,
        error: { message: 'Account not found', status: 404 }
      });
    }

    return createSessionAndRedirect(req, res, freshUser);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        message: 'Error logging in',
        details: error.message,
        status: 500
      }
    });
  }
});

/**
 * Get current user
 */
router.get('/me', isAuthenticated, userController.getCurrentUser);

/**
 * Logout
 */
router.post('/logout', isAuthenticated, userController.logout);

/**
 * Update user role (Admin only)
 */
router.put('/users/:userId/role', isAuthenticated, isAdmin, userController.updateUserRole);

/**
 * Get all users (Admin only)
 */
router.get('/users', isAuthenticated, isAdmin, userController.getAllUsers);

/**
 * Check authentication status
 */
router.get('/status', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    res.json({
      authenticated: true,
      user: req.user
    });
  } else {
    res.json({
      authenticated: false,
      user: null
    });
  }
});

module.exports = router;
