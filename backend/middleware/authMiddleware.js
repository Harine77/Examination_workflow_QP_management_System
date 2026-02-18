const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. Please login.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    req.user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route',
      error: error.message
    });
  }
};

// Authorize specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

// Check if user can create question papers (Faculty only)
exports.canCreate = (req, res, next) => {
  if (req.user.role !== 'faculty') {
    return res.status(403).json({
      success: false,
      message: 'Only Faculty members can create question papers'
    });
  }
  next();
};

// Check if user can edit question papers (Faculty and Scrutinizer)
exports.canEdit = (req, res, next) => {
  if (!['faculty', 'scrutinizer'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Only Faculty and Scrutinizer can edit question papers'
    });
  }
  next();
};

// Check if user can only view (Panel Member)
exports.canView = (req, res, next) => {
  // All authenticated users can view
  next();
};

// Check if user can finalize (HOD only)
exports.canFinalize = (req, res, next) => {
  if (req.user.role !== 'hod') {
    return res.status(403).json({
      success: false,
      message: 'Only HOD can finalize question papers'
    });
  }
  next();
};