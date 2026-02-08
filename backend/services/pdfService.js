const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class PDFService {
  
  // Generate HTML content for question paper
  static generateHTML(paperData) {
    const { courseInfo, courseOutcomes, questions, examFormat } = paperData;
    
    // Get exam-specific details
    const getExamDetails = () => {
      if (examFormat === 'CAT' || examFormat === 'SAT') {
        return {
          title: `Continuous Assessment Test – ${courseInfo.catNumber || 'I'}`,
          time: '90 Minutes',
          maxMarks: '50 Marks',
          partADesc: '4 × 2 = 8 Marks',
          partBDesc: '3 × 6 = 18 Marks',
          partCDesc: '2 × 12 = 24 Marks'
        };
      } else {
        return {
          title: `End Semester Theory Examinations, ${courseInfo.month || ''} ${courseInfo.year || ''}`,
          time: 'Three Hours',
          maxMarks: '100 Marks',
          partADesc: '5 × 2 = 10 Marks',
          partBDesc: '5 × 6 = 30 Marks',
          partCDesc: '5 × 12 = 60 Marks'
        };
      }
    };

    const examDetails = getExamDetails();

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm;
    }
    
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.4;
      color: #000;
    }
    
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }
    
    .header h1 {
      font-size: 16pt;
      margin: 5px 0;
      font-weight: bold;
    }
    
    .header h2 {
      font-size: 14pt;
      margin: 5px 0;
      font-weight: bold;
    }
    
    .header p {
      font-size: 10pt;
      margin: 3px 0;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
      font-size: 11pt;
    }
    
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }
    
    .info-table td {
      padding: 5px;
      font-size: 11pt;
    }
    
    .legend {
      background-color: #f0f0f0;
      padding: 8px;
      margin: 10px 0;
      font-size: 10pt;
      border: 1px solid #ccc;
    }
    
    .course-outcomes {
      margin: 15px 0;
      padding: 10px;
      background-color: #f9f9f9;
      border: 1px solid #ddd;
    }
    
    .course-outcomes h3 {
      font-size: 12pt;
      margin: 0 0 10px 0;
    }
    
    .co-item {
      margin: 5px 0;
      font-size: 11pt;
    }
    
    .part-header {
      font-size: 13pt;
      font-weight: bold;
      margin: 20px 0 10px 0;
      padding: 5px 0;
      border-bottom: 2px solid #000;
    }
    
    .question-row {
      display: flex;
      margin: 15px 0;
      page-break-inside: avoid;
    }
    
    .question-number {
      min-width: 40px;
      font-weight: bold;
      flex-shrink: 0;
    }
    
    .question-content {
      flex: 1;
      padding-right: 10px;
    }
    
    .question-meta {
      min-width: 150px;
      text-align: center;
      border-left: 1px solid #ccc;
      padding-left: 10px;
      flex-shrink: 0;
    }
    
    .meta-table {
      width: 100%;
      font-size: 10pt;
    }
    
    .meta-table td {
      padding: 3px;
      border: 1px solid #999;
    }
    
    .or-text {
      text-align: center;
      margin: 10px 0;
      font-weight: bold;
      font-style: italic;
    }
    
    .footer {
      margin-top: 30px;
      display: flex;
      justify-content: space-between;
      font-size: 11pt;
      border-top: 1px solid #ccc;
      padding-top: 10px;
    }
    
    .footer-item {
      text-align: center;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <h1>Sri Sivasubramaniya Nadar College of Engineering, Kalavakkam – 603 110</h1>
    <p style="font-size: 10pt;">(An Autonomous Institution, Affiliated to Anna University, Chennai)</p>
    <p style="font-size: 9pt; margin-top: 5px;">${courseInfo.department || '<Name of the Department>'}</p>
    <h2 style="margin-top: 10px;">${examDetails.title}</h2>
    <p>Regulations – R2021 / R2023</p>
  </div>

  <!-- Course Info -->
  <table class="info-table">
    <tr>
      <td><strong>Degree:</strong> ${courseInfo.degree || 'B.E. / B.Tech.'}</td>
      <td><strong>Branch:</strong> ${courseInfo.branch || ''}</td>
    </tr>
    <tr>
      <td><strong>Semester:</strong> ${courseInfo.semester || ''}</td>
      <td><strong>Date:</strong> ${courseInfo.examDate || courseInfo.month + ' ' + courseInfo.year || ''}</td>
    </tr>
    <tr>
      <td colspan="2"><strong>Subject Code & Name:</strong> ${courseInfo.courseCode} - ${courseInfo.courseName}</td>
    </tr>
    <tr>
      <td><strong>Time:</strong> ${examDetails.time}</td>
      <td><strong>Maximum:</strong> ${examDetails.maxMarks}</td>
    </tr>
  </table>

  <!-- Bloom's Taxonomy Legend -->
  <div class="legend">
    <strong>Knowledge Levels:</strong> K1: Remembering, K2: Understanding, K3: Applying, K4: Analyzing, K5: Evaluating, K6: Creating
  </div>

  <!-- Course Outcomes -->
  <div class="course-outcomes">
    <h3>COURSE OUTCOMES:</h3>
    ${courseOutcomes.map(co => `
      <div class="co-item"><strong>${co.coNumber}:</strong> ${co.description}</div>
    `).join('')}
  </div>

  <!-- Part A -->
  <div class="part-header">Part – A (${examDetails.partADesc})</div>
  <table style="width: 100%; margin-bottom: 10px;">
    <tr style="text-align: center; font-weight: bold; font-size: 10pt;">
      <td style="width: 40px;"></td>
      <td></td>
      <td style="width: 50px; border: 1px solid #000;">KL</td>
      <td style="width: 50px; border: 1px solid #000;">CO</td>
      <td style="width: 50px; border: 1px solid #000;">PI</td>
    </tr>
  </table>
  
  ${questions.partA.map(q => `
    <div class="question-row">
      <div class="question-number">${q.number}.</div>
      <div class="question-content">${q.text || '<Question Text>'}</div>
      <div class="question-meta">
        <table class="meta-table">
          <tr>
            <td>${q.kl || ''}</td>
            <td>${q.co || ''}</td>
            <td>${q.pi || ''}</td>
          </tr>
        </table>
      </div>
    </div>
  `).join('')}

  <!-- Part B -->
  <div class="part-header">Part – B (${examDetails.partBDesc})</div>
  ${examFormat === 'SEM' ? '<p style="font-size: 10pt; font-style: italic;">(No Sub-divisions in Part-B)</p>' : ''}
  <table style="width: 100%; margin-bottom: 10px;">
    <tr style="text-align: center; font-weight: bold; font-size: 10pt;">
      <td style="width: 40px;"></td>
      <td></td>
      <td style="width: 50px; border: 1px solid #000;">KL</td>
      <td style="width: 50px; border: 1px solid #000;">CO</td>
      <td style="width: 50px; border: 1px solid #000;">PI</td>
    </tr>
  </table>
  
  ${questions.partB.map(q => `
    <div class="question-row">
      <div class="question-number">${q.number}.</div>
      <div class="question-content">${q.text || '<Question Text>'}</div>
      <div class="question-meta">
        <table class="meta-table">
          <tr>
            <td>${q.kl || ''}</td>
            <td>${q.co || ''}</td>
            <td>${q.pi || ''}</td>
          </tr>
        </table>
      </div>
    </div>
  `).join('')}

  <!-- Part C -->
  <div class="part-header">Part – C (${examDetails.partCDesc})</div>
  ${examFormat === 'SEM' ? '<p style="font-size: 10pt; font-style: italic;">(Maximum two Sub-divisions in Part-C with either 4 or 5 marks)</p>' : ''}
  <table style="width: 100%; margin-bottom: 10px;">
    <tr style="text-align: center; font-weight: bold; font-size: 10pt;">
      <td style="width: 40px;"></td>
      <td></td>
      <td style="width: 50px; border: 1px solid #000;">KL</td>
      <td style="width: 50px; border: 1px solid #000;">CO</td>
      <td style="width: 50px; border: 1px solid #000;">PI</td>
    </tr>
  </table>
  
  ${questions.partC.map(q => `
    ${q.isOr ? '<div class="or-text">(OR)</div>' : ''}
    <div class="question-row">
      <div class="question-number">${q.number}.</div>
      <div class="question-content">${q.text || '<Question Text>'}</div>
      <div class="question-meta">
        <table class="meta-table">
          <tr>
            <td>${q.kl || ''}</td>
            <td>${q.co || ''}</td>
            <td>${q.pi || ''}</td>
          </tr>
        </table>
      </div>
    </div>
  `).join('')}

  <!-- Footer -->
  <div class="footer">
    <div class="footer-item">
      <strong>Prepared By</strong><br>
      <span style="text-decoration: underline;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><br>
      <span style="font-size: 9pt;">&lt;Faculty Name&gt;</span>
    </div>
    <div class="footer-item">
      <strong>Reviewed By</strong><br>
      <span style="text-decoration: underline;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><br>
      <span style="font-size: 9pt;">&lt;Course Coordinator&gt;</span>
    </div>
    <div class="footer-item">
      <strong>Approved By</strong><br>
      <span style="text-decoration: underline;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span><br>
      <span style="font-size: 9pt;">&lt;HoD&gt;</span>
    </div>
  </div>

</body>
</html>
    `;
  }

  // Generate PDF from HTML
  static async generatePDF(paperData) {
    const html = this.generateHTML(paperData);
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });
    
    await browser.close();
    
    return pdfBuffer;
  }

  // Save PDF to file system
  static async savePDF(pdfBuffer, paperData) {
    const { courseInfo, examFormat } = paperData;
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../uploads/question-papers');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filename = `${courseInfo.courseCode}_${examFormat}${courseInfo.catNumber ? '-' + courseInfo.catNumber : ''}_${timestamp}.pdf`;
    const filepath = path.join(uploadsDir, filename);
    
    // Write file
    fs.writeFileSync(filepath, pdfBuffer);
    
    return {
      filename,
      filepath,
      relativePath: `/uploads/question-papers/${filename}`
    };
  }
}

module.exports = PDFService;