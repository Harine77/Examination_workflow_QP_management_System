const express = require('express');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');  // ADD THIS LINE
const User = require('../models/user');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, role, enrolledCourses } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email and password'
      });
    }

    // Scrutinizer 1 must enroll in at least one course
    if (role === 'scrutinizer_1' && (!enrolledCourses || enrolledCourses.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Scrutinizer 1 must enroll in at least one course'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
        where: {
            [Op.or]: [{ email }, { username }]
        }
        });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      role: role || 'faculty',
      enrolledCourses: role === 'scrutinizer_1' ? (enrolledCourses || []) : []
    });

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        enrolledCourses: user.enrolledCourses || [],
        token
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if user exists
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        enrolledCourses: user.enrolledCourses || [],
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        isActive: req.user.isActive
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user data',
      error: error.message
    });
  }
});

// @route   PUT /api/auth/update-profile
// @desc    Update user profile
// @access  Private
router.put('/update-profile', protect, async (req, res) => {
  try {
    const { username, email } = req.body;
    const updateData = {};

    if (username) updateData.username = username;
    if (email) updateData.email = email;

    await req.user.update(updateData);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password and new password'
      });
    }

    // Verify current password
    const user = await User.findByPk(req.user.id);
    const isPasswordValid = await user.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    });
  }
});

// Update enrolled courses for scrutinizer_1 and faculty
router.put('/enrolled-courses', protect, async (req, res) => {
  try {
    // Allow any authenticated user to update their enrolled courses
    const { enrolledCourses } = req.body;
    await req.user.update({ enrolledCourses: enrolledCourses || [] });
    res.json({ success: true, message: 'Enrolled courses updated', enrolledCourses: req.user.enrolledCourses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Scrutinizer 1 and Faculty request course enrollment — goes to HOD for approval
router.post('/request-courses', protect, async (req, res) => {
  try {
    console.log('Request courses - User role:', req.user.role); // Debug log
    
    // Allow faculty, scrutinizer_1, and any other role to request courses
    const { courseIds } = req.body;
    if (!courseIds || courseIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No courses selected' });
    }
    // Merge with existing pending requests (avoid duplicates)
    const existing = req.user.pendingCourseRequests || [];
    const merged = [...new Set([...existing, ...courseIds])];
    await req.user.update({ pendingCourseRequests: merged });
    res.json({ success: true, message: 'Course enrollment request sent to HOD for approval' });
  } catch (err) {
    console.error('Request courses error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// HOD: get all pending enrollment requests
router.get('/enrollment-requests', protect, async (req, res) => {
  try {
    if (req.user.role !== 'hod') {
      return res.status(403).json({ success: false, message: 'Only HOD can view enrollment requests' });
    }
    const Course = require('../models/Course');
    const users = await User.findAll({
      where: { role: ['scrutinizer_1', 'faculty'] },
      attributes: ['id', 'username', 'email', 'role', 'enrolledCourses', 'pendingCourseRequests'],
    });
    const requests = [];
    for (const u of users) {
      if (u.pendingCourseRequests && u.pendingCourseRequests.length > 0) {
        const courses = await Course.findAll({ where: { id: u.pendingCourseRequests }, attributes: ['id', 'courseCode', 'courseName'] });
        requests.push({ 
          scrutinizerId: u.id, // keeping the same field name for backward compatibility
          userId: u.id,
          username: u.username, 
          email: u.email,
          role: u.role,
          requestedCourses: courses 
        });
      }
    }
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// HOD: approve or reject enrollment request
router.post('/enrollment-requests/:scrutinizerId/decide', protect, async (req, res) => {
  try {
    if (req.user.role !== 'hod') {
      return res.status(403).json({ success: false, message: 'Only HOD can approve enrollment requests' });
    }
    const { action, courseIds } = req.body; // action: 'approve' | 'reject'
    const user = await User.findByPk(req.params.scrutinizerId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (action === 'approve') {
      const current = user.enrolledCourses || [];
      const newEnrolled = [...new Set([...current, ...courseIds])];
      await user.update({ enrolledCourses: newEnrolled, pendingCourseRequests: [] });
      res.json({ success: true, message: 'Enrollment approved' });
    } else {
      await user.update({ pendingCourseRequests: [] });
      res.json({ success: true, message: 'Enrollment request rejected' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
