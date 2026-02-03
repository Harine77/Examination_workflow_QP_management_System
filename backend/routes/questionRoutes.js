const express = require('express');
const router = express.Router();
const NLPService = require('../services/nlpService');

// Analyze question and return CO/KL mapping
router.post('/analyze', async (req, res) => {
  try {
    const { questionText, courseId } = req.body;
    
    // Validation
    if (!questionText || !questionText.trim()) {
      return res.status(400).json({ error: 'Question text is required' });
    }
    
    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required' });
    }
    
    // Analyze question
    const result = await NLPService.analyzeQuestion(questionText, courseId);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error analyzing question:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to analyze question',
      message: error.message 
    });
  }
});

module.exports = router;