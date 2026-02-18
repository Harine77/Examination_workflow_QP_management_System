const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const CourseOutcome = require('../models/CourseOutcome');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Get all courses (All authenticated users)
router.get('/', async (req, res) => {
  try {
    const courses = await Course.findAll();
    res.json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch courses' 
    });
  }
});

// Get single course by ID (All authenticated users)
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id, {
      include: [CourseOutcome]
    });
    
    if (!course) {
      return res.status(404).json({ 
        success: false,
        error: 'Course not found' 
      });
    }
    
    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch course' 
    });
  }
});

// Create new course with outcomes (All authenticated users can create courses)
router.post('/', async (req, res) => {
  try {
    const { courseCode, courseName, semester, syllabus, outcomes } = req.body;
    
    // Create course
    const course = await Course.create({
      courseCode,
      courseName,
      semester,
      syllabus
    });
    
    // Create course outcomes if provided
    if (outcomes && outcomes.length > 0) {
      const outcomePromises = outcomes.map(outcome => 
        CourseOutcome.create({
          CourseId: course.id,
          coNumber: outcome.coNumber,
          description: outcome.description,
          keywords: outcome.keywords || []
        })
      );
      
      await Promise.all(outcomePromises);
    }
    
    // Return course with outcomes
    const createdCourse = await Course.findByPk(course.id, {
      include: [CourseOutcome]
    });
    
    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: createdCourse
    });
    
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create course',
      message: error.message
    });
  }
});

// Get course outcomes for a specific course (All authenticated users)
router.get('/:id/outcomes', async (req, res) => {
  try {
    const outcomes = await CourseOutcome.findAll({
      where: { CourseId: req.params.id }
    });
    
    res.json({
      success: true,
      count: outcomes.length,
      data: outcomes
    });
  } catch (error) {
    console.error('Error fetching outcomes:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch course outcomes' 
    });
  }
});

module.exports = router;