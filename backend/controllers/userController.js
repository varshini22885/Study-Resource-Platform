const User = require('../models/User');

/**
 * Get current user profile
 */
exports.getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'Not authenticated',
          status: 401
        }
      });
    }

    const user = await User.findById(req.user.id).select('-password');
    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      error: {
        message: 'Error fetching user profile',
        details: error.message,
        status: 500
      }
    });
  }
};

/**
 * Update user role (Admin only)
 */
exports.updateUserRole = async (req, res) => {
  try {
    const { userId, role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        error: {
          message: 'Invalid role',
          status: 400
        }
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          status: 404
        }
      });
    }

    res.json({
      success: true,
      message: 'User role updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({
      error: {
        message: 'Error updating user role',
        details: error.message,
        status: 500
      }
    });
  }
};

/**
 * Get all users (Admin only)
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      error: {
        message: 'Error fetching users',
        details: error.message,
        status: 500
      }
    });
  }
};

/**
 * Logout user
 */
exports.logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        error: {
          message: 'Error logging out',
          details: err.message,
          status: 500
        }
      });
    }
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
};
