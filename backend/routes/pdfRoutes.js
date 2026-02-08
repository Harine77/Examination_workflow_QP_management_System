const express = require('express');
const router = express.Router();
const PDFService = require('../services/pdfService');
const QuestionPaper = require('../models/QuestionPaper');
const Question = require('../models/Question');
const Course = require('../models/Course');
const CourseOutcome = require('../models/CourseOutcome');

// Generate and download PDF
router.post('/generate', async (req, res) => {
  try {
    const { courseInfo, courseOutcomes, questions, examFormat } = req.body;
    
    // Validation
    if (!courseInfo || !courseOutcomes || !questions || !examFormat) {
      return res.status(400).json({ error: 'Missing required data' });
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
    
    // Optional: Save question paper record to database
    // (We'll implement this later for the workflow)
    
    // Send PDF as download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${savedFile.filename}"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate PDF',
      message: error.message 
    });
  }
});

// Get list of generated question papers
router.get('/list', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const uploadsDir = path.join(__dirname, '../uploads/question-papers');
    
    if (!fs.existsSync(uploadsDir)) {
      return res.json([]);
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
    
    res.json(fileList);
    
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Download existing PDF
router.get('/download/:filename', (req, res) => {
  try {
    const path = require('path');
    const fs = require('fs');
    
    const filename = req.params.filename;
    const filepath = path.join(__dirname, '../uploads/question-papers', filename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.download(filepath);
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

module.exports = router;