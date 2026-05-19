const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

/**
 * Get current user profile
 */
router.get('/me', isAuthenticated, userController.getCurrentUser);

/**
 * Get all users (Admin only)
 */
router.get('/', isAuthenticated, isAdmin, userController.getAllUsers);

/**
 * Update user role (Admin only)
 */
router.put('/:userId/role', isAuthenticated, isAdmin, userController.updateUserRole);

module.exports = router;
