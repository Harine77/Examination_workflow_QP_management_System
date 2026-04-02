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

// Generate PDF from paper ID — panel members only
router.get('/paper/:id', async (req, res) => {
  try {
    if (!['panel', 'panel_member'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Only panel members can download PDFs' });
    }

    const paper = await QuestionPaper.findByPk(req.params.id, {
      include: [
        { model: Course, attributes: ['courseCode', 'courseName', 'semester'] },
        { model: Question, include: [{ model: CourseOutcome, attributes: ['coNumber'] }] },
      ],
    });

    if (!paper) return res.status(404).json({ success: false, error: 'Paper not found' });

    const questions = (paper.Questions || []).sort((a, b) => {
      if (a.part !== b.part) return a.part.localeCompare(b.part);
      return a.questionNumber - b.questionNumber;
    });

    const partA = questions.filter(q => q.part === 'A');
    const partB = questions.filter(q => q.part === 'B');
    const partC = questions.filter(q => q.part === 'C');

    const courseInfo = {
      courseCode: paper.Course?.courseCode || '',
      courseName: paper.Course?.courseName || '',
      semester: paper.Course?.semester || '',
      department: 'Computer Science and Engineering',
      degree: 'B.E. / B.Tech.',
      branch: 'CSE',
      regulation: 'R2021',
      catNumber: paper.catNumber || '',
      examDate: paper.examDate ? new Date(paper.examDate).toLocaleDateString() : '',
      month: '',
      year: '',
    };

    const courseOutcomes = [
      { coNumber: 'CO1', description: 'Course Outcome 1' },
      { coNumber: 'CO2', description: 'Course Outcome 2' },
      { coNumber: 'CO3', description: 'Course Outcome 3' },
    ];

    const pdfData = {
      courseInfo,
      courseOutcomes,
      questions: {
        partA: partA.map(q => ({ number: q.questionNumber, text: q.questionText, kl: q.klLevel || '', co: q.CourseOutcome?.coNumber || '', marks: q.marks })),
        partB: partB.map(q => ({ number: q.questionNumber, text: q.questionText, kl: q.klLevel || '', co: q.CourseOutcome?.coNumber || '', marks: q.marks })),
        partC: partC.map((q, i) => ({ number: q.questionNumber, text: q.questionText, kl: q.klLevel || '', co: q.CourseOutcome?.coNumber || '', marks: q.marks, isOr: i % 2 === 1 })),
      },
      examFormat: paper.examType || 'CAT',
    };

    const pdfBuffer = await PDFService.generatePDF(pdfData);
    const filename = `${paper.Course?.courseCode || 'paper'}_${paper.examType || 'exam'}${paper.catNumber ? '_' + paper.catNumber : ''}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF paper route error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate PDF', message: err.message });
  }
});
