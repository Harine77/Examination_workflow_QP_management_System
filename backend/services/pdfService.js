const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Load college logo as base64 for embedding in PDF
const logoPath = path.join(__dirname, '../assets/ssn-logo.png');
const logoBase64 = fs.existsSync(logoPath)
  ? `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`
  : null;

class PDFService {

  // Generate HTML content for question paper
  static generateHTML(paperData) {
    const { courseInfo, courseOutcomes, questions, examFormat } = paperData;

    const getExamDetails = () => {
      if (examFormat === 'CAT') {
        return {
          title: `CONTINUOUS ASSESSMENT TEST &ndash; ${courseInfo.catNumber || 'I'}`,
          time: '90 Minutes',
          maxMarks: '50 Marks',
          partADesc: '4 &times; 2 = 8 Marks',
          partBDesc: '3 &times; 6 = 18 Marks',
          partCDesc: '2 &times; 12 = 24 Marks',
          partCInstruction: 'Answer Any <strong>TWO</strong> of the following'
        };
      } else if (examFormat === 'SAT') {
        return {
          title: `SUMMATIVE ASSESSMENT TEST &ndash; ${courseInfo.catNumber || 'I'}`,
          time: '90 Minutes',
          maxMarks: '50 Marks',
          partADesc: '4 &times; 2 = 8 Marks',
          partBDesc: '3 &times; 6 = 18 Marks',
          partCDesc: '2 &times; 12 = 24 Marks',
          partCInstruction: 'Answer Any <strong>TWO</strong> of the following'
        };
      } else {
        return {
          title: `END SEMESTER THEORY EXAMINATIONS &ndash; ${(courseInfo.month || '').toUpperCase()} ${courseInfo.year || ''}`,
          time: 'Three Hours',
          maxMarks: '100 Marks',
          partADesc: '5 &times; 2 = 10 Marks',
          partBDesc: '5 &times; 6 = 30 Marks',
          partCDesc: '5 &times; 12 = 60 Marks',
          partCInstruction: 'Answer <strong>ALL</strong> Questions'
        };
      }
    };

    const examDetails = getExamDetails();
    const regulation = courseInfo.regulation || 'R2021';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 12mm 14mm;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 10.5pt;
      line-height: 1.35;
      color: #000;
    }

    table {
      border-collapse: collapse;
      width: 100%;
    }

    /* ── HEADER TABLE ── */
    .header-table td {
      border: 1.5px solid #000;
      padding: 4px 8px;
      vertical-align: middle;
    }
    .logo-cell {
      width: 72px;
      text-align: center;
      font-size: 8pt;
      color: #555;
    }
    .college-info-cell {
      text-align: center;
    }
    .college-name {
      font-size: 13pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .college-sub {
      font-size: 9pt;
      font-style: italic;
      margin-top: 2px;
    }
    .dept-name {
      font-size: 10.5pt;
      margin-top: 3px;
    }
    .exam-title {
      font-size: 12pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 4px;
    }

    /* ── METADATA TABLE ── */
    .meta-table td {
      border: 1.5px solid #000;
      padding: 4px 8px;
      font-size: 10.5pt;
      vertical-align: middle;
    }

    /* ── KL LEGEND ── */
    .kl-legend {
      border: 1.5px solid #000;
      border-top: none;
      padding: 4px 8px;
      font-size: 9pt;
      text-align: center;
    }

    /* ── CO TABLE ── */
    .co-table td {
      border: 1.5px solid #000;
      border-top: none;
      padding: 4px 6px;
      font-size: 9.5pt;
      vertical-align: top;
      word-wrap: break-word;
    }
    .co-title-row td {
      text-align: center;
      font-weight: bold;
      font-size: 10.5pt;
      background-color: #f2f2f2;
    }
    .co-label {
      width: 42px;
      font-weight: bold;
      white-space: nowrap;
    }

    /* ── PART HEADER ── */
    .part-block {
      margin-top: 10px;
    }
    .part-title {
      text-align: center;
      font-size: 11pt;
      font-weight: bold;
      border: 1.5px solid #000;
      padding: 4px;
    }
    .part-instruction {
      text-align: center;
      font-size: 9.5pt;
      font-style: italic;
      border: 1.5px solid #000;
      border-top: none;
      padding: 3px;
    }

    /* ── QUESTION TABLE ── */
    .q-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 0;
    }
    .q-table th {
      border: 1.5px solid #000;
      border-top: none;
      padding: 3px 5px;
      text-align: center;
      font-size: 9.5pt;
      background-color: #f2f2f2;
    }
    .q-table td {
      border: 1.5px solid #000;
      padding: 5px 6px;
      font-size: 10.5pt;
      vertical-align: top;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .q-table th.col-no  { width: 38px; }
    .q-table th.col-kl  { width: 42px; }
    .q-table th.col-co  { width: 42px; }
    .col-center { text-align: center; }

    /* ── OR ROW ── */
    .or-row td {
      text-align: center;
      font-weight: bold;
      font-style: italic;
      font-size: 10pt;
      padding: 3px 0;
      border-left: 1.5px solid #000;
      border-right: 1.5px solid #000;
      border-top: none;
      border-bottom: none;
    }

    /* ── FOOTER ── */
    .footer-table {
      margin-top: 22px;
      width: 100%;
      border-top: 1.5px solid #000;
      padding-top: 6px;
    }
    .footer-table td {
      text-align: center;
      padding: 6px 8px;
      font-size: 10pt;
      width: 33%;
      vertical-align: bottom;
    }
    .sig-line {
      display: inline-block;
      width: 120px;
      border-top: 1px solid #000;
      margin-top: 28px;
    }
  </style>
</head>
<body>

  <!-- ═══ HEADER TABLE ═══ -->
  <table class="header-table">
    <tbody>
      <tr>
        <td class="logo-cell" rowspan="4">
          ${logoBase64
            ? `<img src="${logoBase64}" style="width:65px; height:auto;" />`
            : ''}
        </td>
        <td class="college-info-cell">
          <div class="college-name">Sri Sivasubramaniya Nadar College of Engineering, Kalavakkam &ndash; 603 110</div>
        </td>
      </tr>
      <tr>
        <td class="college-info-cell">
          <div class="college-sub">(An Autonomous Institution, Affiliated to Anna University, Chennai)</div>
        </td>
      </tr>
      <tr>
        <td class="college-info-cell">
          <div class="dept-name">Department of ${courseInfo.department || 'Computer Science and Engineering'}</div>
        </td>
      </tr>
      <tr>
        <td class="college-info-cell">
          <div class="exam-title">${examDetails.title}</div>
        </td>
      </tr>
    </tbody>
  </table>

  <!-- ═══ METADATA TABLE ═══ -->
  <table class="meta-table" style="border-top: none;">
    <tbody>
      <tr>
        <td style="width:22%;"><strong>Degree&nbsp;:</strong> ${courseInfo.degree || 'B.E. / B.Tech.'}</td>
        <td style="width:22%;"><strong>Branch&nbsp;:</strong> ${courseInfo.branch || ''}</td>
        <td style="width:18%;"><strong>Semester&nbsp;:</strong> ${courseInfo.semester || ''}</td>
        <td style="width:38%;"><strong>Date&nbsp;:</strong> ${examFormat === 'SEM' ? (courseInfo.month || '') + ' ' + (courseInfo.year || '') : (courseInfo.examDate || '')}</td>
      </tr>
      <tr>
        <td colspan="4"><strong>Course Code &amp; Title&nbsp;:</strong> ${courseInfo.courseCode} &ndash; ${courseInfo.courseName}</td>
      </tr>
      <tr>
        <td colspan="2"><strong>Time&nbsp;:</strong> ${examDetails.time}</td>
        <td colspan="2"><strong>Maximum&nbsp;:</strong> ${examDetails.maxMarks}</td>
      </tr>
      <tr>
        <td colspan="4" style="text-align:center; font-weight:bold;">Regulations &ndash; ${regulation}</td>
      </tr>
    </tbody>
  </table>

  <!-- ═══ KL LEGEND ═══ -->
  <div class="kl-legend">
    K1 &ndash; Remembering &nbsp;|&nbsp; K2 &ndash; Understanding &nbsp;|&nbsp; K3 &ndash; Applying &nbsp;|&nbsp;
    K4 &ndash; Analyzing &nbsp;|&nbsp; K5 &ndash; Evaluating &nbsp;|&nbsp; K6 &ndash; Creating
  </div>

  <!-- ═══ COURSE OUTCOMES TABLE ═══ -->
  <table class="co-table">
    <tbody>
      <tr class="co-title-row">
        <td colspan="2">COURSE OUTCOMES</td>
      </tr>
      ${courseOutcomes.map(co => `
      <tr>
        <td class="co-label">${co.coNumber}:</td>
        <td>${co.description || ''}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <!-- ═══ PART A ═══ -->
  <div class="part-block">
    <div class="part-title">PART &ndash; A &nbsp;&nbsp; (${examDetails.partADesc})</div>
    <div class="part-instruction">Answer <strong>ALL</strong> Questions</div>
    <table class="q-table">
      <thead>
        <tr>
          <th class="col-no">Q.No</th>
          <th class="col-q">Questions</th>
          <th class="col-kl">KL</th>
          <th class="col-co">CO</th>
        </tr>
      </thead>
      <tbody>
        ${questions.partA.map(q => `
          <tr>
            <td class="col-center">${q.number}</td>
            <td>${q.text || ''}</td>
            <td class="col-center">${q.kl || ''}</td>
            <td class="col-center">${q.co || ''}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- ═══ PART B ═══ -->
  <div class="part-block">
    <div class="part-title">PART &ndash; B &nbsp;&nbsp; (${examDetails.partBDesc})</div>
    <div class="part-instruction">Answer <strong>ALL</strong> Questions${examFormat === 'SEM' ? '<br><em>(No Sub-divisions in Part-B)</em>' : ''}</div>
    <table class="q-table">
      <thead>
        <tr>
          <th class="col-no">Q.No</th>
          <th class="col-q">Questions</th>
          <th class="col-kl">KL</th>
          <th class="col-co">CO</th>
        </tr>
      </thead>
      <tbody>
        ${questions.partB.map(q => `
          <tr>
            <td class="col-center">${q.number}</td>
            <td>${q.text || ''}</td>
            <td class="col-center">${q.kl || ''}</td>
            <td class="col-center">${q.co || ''}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- ═══ PART C ═══ -->
  <div class="part-block">
    <div class="part-title">PART &ndash; C &nbsp;&nbsp; (${examDetails.partCDesc})</div>
    <div class="part-instruction">${examDetails.partCInstruction}${examFormat === 'SEM' ? '<br><em>(Maximum two Sub-divisions with either 4 or 5 marks)</em>' : ''}</div>
    <table class="q-table">
      <thead>
        <tr>
          <th class="col-no">Q.No</th>
          <th class="col-q">Questions</th>
          <th class="col-kl">KL</th>
          <th class="col-co">CO</th>
        </tr>
      </thead>
      <tbody>
        ${questions.partC.map(q => `
          ${q.isOr ? `<tr class="or-row"><td colspan="4">(OR)</td></tr>` : ''}
          <tr>
            <td class="col-center">${q.number}</td>
            <td>${q.text || ''}</td>
            <td class="col-center">${q.kl || ''}</td>
            <td class="col-center">${q.co || ''}</td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>

  <!-- ═══ FOOTER ═══ -->
  <table class="footer-table">
    <tr>
      <td>
        <div class="sig-line"></div><br>
        <strong>Prepared By</strong><br>
        <em style="font-size:9pt;">(Faculty)</em>
      </td>
      <td>
        <div class="sig-line"></div><br>
        <strong>Reviewed By</strong><br>
        <em style="font-size:9pt;">(Course Coordinator)</em>
      </td>
      <td>
        <div class="sig-line"></div><br>
        <strong>Approved By</strong><br>
        <em style="font-size:9pt;">(HoD)</em>
      </td>
    </tr>
  </table>

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
        top: '12mm',
        right: '14mm',
        bottom: '12mm',
        left: '14mm'
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