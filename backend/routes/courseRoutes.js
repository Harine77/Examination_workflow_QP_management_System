const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const CourseOutcome = require('../models/CourseOutcome');

// Get all courses
router.get('/', async (req, res) => {
  try {
    const courses = await Course.findAll();
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get single course by ID
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id, {
      include: [CourseOutcome]
    });
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    res.json(course);
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
});

// Create new course with outcomes
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
    
    res.status(201).json(createdCourse);
    
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// Get course outcomes for a specific course
router.get('/:id/outcomes', async (req, res) => {
  try {
    const outcomes = await CourseOutcome.findAll({
      where: { CourseId: req.params.id }
    });
    res.json(outcomes);
  } catch (error) {
    console.error('Error fetching outcomes:', error);
    res.status(500).json({ error: 'Failed to fetch course outcomes' });
  }
});

module.exports = router;