/**
 * Middleware to check if user is authenticated
 */
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({
    error: {
      message: 'Unauthorized. Please log in.',
      status: 401
    }
  });
};

/**
 * Middleware to check if user is admin
 */
const isAdmin = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    if (req.user.role === 'admin') {
      return next();
    }
    return res.status(403).json({
      error: {
        message: 'Forbidden. Admin role required.',
        status: 403
      }
    });
  }
  return res.status(401).json({
    error: {
      message: 'Unauthorized. Please log in.',
      status: 401
    }
  });
};

module.exports = {
  isAuthenticated,
  isAdmin
};
