const express = require('express');
const router = express.Router();
const PDFService = require('../services/pdfService');
const QuestionPaper = require('../models/QuestionPaper');
const Question = require('../models/Question');
const Course = require('../models/Course');
const CourseOutcome = require('../models/CourseOutcome');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Generate and download PDF (All authenticated users)
router.post('/generate', async (req, res) => {
  try {
    const { courseInfo, courseOutcomes, questions, examFormat } = req.body;
    
    // Validation
    if (!courseInfo || !courseOutcomes || !questions || !examFormat) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required data' 
      });
    }
    
    // Generate PDF
    const pdfBuffer = await PDFService.generatePDF({
      courseInfo,
      courseOutcomes,
      questions,
      examFormat
    });
    
    // Save PDF to file system
    const savedFile = await PDFService.savePDF(pdfBuffer, {
      courseInfo,
      examFormat
    });
    
    // Send PDF as download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${savedFile.filename}"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate PDF',
      message: error.message 
    });
  }
});

// Get list of generated question papers (All authenticated users)
router.get('/list', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const uploadsDir = path.join(__dirname, '../uploads/question-papers');
    
    if (!fs.existsSync(uploadsDir)) {
      return res.json({
        success: true,
        count: 0,
        data: []
      });
    }
    
    const files = fs.readdirSync(uploadsDir);
    const fileList = files.map(filename => {
      const stats = fs.statSync(path.join(uploadsDir, filename));
      return {
        filename,
        createdAt: stats.birthtime,
        size: stats.size
      };
    }).sort((a, b) => b.createdAt - a.createdAt);
    
    res.json({
      success: true,
      count: fileList.length,
      data: fileList
    });
    
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to list files' 
    });
  }
});

// Download existing PDF (All authenticated users)
router.get('/download/:filename', (req, res) => {
  try {
    const path = require('path');
    const fs = require('fs');
    
    const filename = req.params.filename;
    const filepath = path.join(__dirname, '../uploads/question-papers', filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ 
        success: false,
        error: 'File not found' 
      });
    }
    
    res.download(filepath);
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to download file' 
    });
  }
});

module.exports = router;