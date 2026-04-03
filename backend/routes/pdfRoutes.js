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

// Generate Answer Key PDF from paper ID — panel members only
router.get('/answer-key/:id', async (req, res) => {
  try {
    if (!['panel', 'panel_member'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Only panel members can download answer key PDFs' });
    }

    const paper = await QuestionPaper.findByPk(req.params.id, {
      include: [{ model: Course, attributes: ['courseCode', 'courseName'] }],
    });

    if (!paper) return res.status(404).json({ success: false, error: 'Paper not found' });
    if (!paper.answerKey?.items?.length) {
      return res.status(400).json({ success: false, error: 'No answer key found for this paper' });
    }

    const courseCode = paper.Course?.courseCode || 'Paper';
    const items = paper.answerKey.items;

    // Build HTML for answer key PDF
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', serif; font-size: 10.5pt; color: #000; line-height: 1.4; }
  .header { text-align: center; border: 1.5px solid #000; padding: 10px; margin-bottom: 0; }
  .college { font-size: 13pt; font-weight: bold; text-transform: uppercase; }
  .sub { font-size: 9pt; font-style: italic; margin-top: 3px; }
  .title { font-size: 12pt; font-weight: bold; margin-top: 6px; text-transform: uppercase; }
  .meta { border: 1.5px solid #000; border-top: none; padding: 6px 10px; font-size: 10pt; }
  .section { margin-top: 14px; }
  .part-title { font-weight: bold; font-size: 11pt; border-bottom: 1.5px solid #000; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase; }
  .item { border: 1px solid #ccc; border-radius: 4px; padding: 10px 12px; margin-bottom: 10px; page-break-inside: avoid; }
  .item-header { display: flex; justify-content: space-between; font-weight: bold; font-size: 10.5pt; margin-bottom: 6px; }
  .marks-badge { background: #e8f5ee; color: #155724; padding: 2px 8px; border-radius: 4px; font-size: 9.5pt; }
  .answer { font-size: 10.5pt; margin-bottom: 8px; line-height: 1.6; }
  .sub-title { font-size: 9pt; font-weight: bold; text-transform: uppercase; color: #555; margin: 6px 0 3px; letter-spacing: 0.05em; }
  ul { padding-left: 18px; font-size: 10pt; }
  ul li { margin-bottom: 2px; }
  .overview { background: #f8f9fa; border: 1px solid #dee2e6; padding: 8px 12px; margin-bottom: 14px; font-size: 10pt; font-style: italic; }
</style>
</head>
<body>
  <div class="header">
    <div class="college">Sri Sivasubramaniya Nadar College of Engineering, Kalavakkam – 603 110</div>
    <div class="sub">(An Autonomous Institution, Affiliated to Anna University, Chennai)</div>
    <div class="title">Answer Key — ${courseCode} ${paper.examType || ''}${paper.catNumber ? ' ' + paper.catNumber : ''}</div>
  </div>
  <div class="meta">
    <strong>Course:</strong> ${paper.Course?.courseCode} – ${paper.Course?.courseName} &nbsp;|&nbsp;
    <strong>Generated:</strong> ${paper.answerKeyGeneratedAt ? new Date(paper.answerKeyGeneratedAt).toLocaleDateString() : 'N/A'} &nbsp;|&nbsp;
    <strong>Model:</strong> ${paper.answerKeyModel || 'Ollama'}
  </div>

  ${paper.answerKey.overview ? `<div class="overview">${paper.answerKey.overview}</div>` : ''}

  ${['A', 'B', 'C'].map(part => {
    const partItems = items.filter(i => i.part === part);
    if (!partItems.length) return '';
    return `
    <div class="section">
      <div class="part-title">Part ${part}</div>
      ${partItems.map(item => `
        <div class="item">
          <div class="item-header">
            <span>Q${item.questionNumber} (Part ${item.part})</span>
            <span class="marks-badge">${item.marks} marks</span>
          </div>
          <div class="answer">${item.answerKey || ''}</div>
          ${item.keyPoints?.length ? `
            <div class="sub-title">Key Points</div>
            <ul>${item.keyPoints.map(p => `<li>${p}</li>`).join('')}</ul>
          ` : ''}
          ${item.markingScheme?.length ? `
            <div class="sub-title">Marking Scheme</div>
            <ul>${item.markingScheme.map(s => `<li>${s}</li>`).join('')}</ul>
          ` : ''}
        </div>
      `).join('')}
    </div>`;
  }).join('')}
</body>
</html>`;

    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '14mm', right: '14mm', bottom: '14mm', left: '14mm' } });
    await browser.close();

    const filename = `${courseCode}_${paper.examType || 'exam'}_AnswerKey.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Answer key PDF error:', err);
    res.status(500).json({ success: false, error: 'Failed to generate answer key PDF', message: err.message });
  }
});
