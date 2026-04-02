const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send a notification email — silently fails if email not configured
async function sendNotification({ to, subject, html }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  try {
    await transporter.sendMail({
      from: `"Exam Workflow" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.warn('Email notification failed (non-fatal):', err.message);
  }
}

// Panel member submitted paper to HOD → notify scrutinizers who worked on it
async function notifyScrutinizersOnPanelSubmit({ paper, panelMemberName, scrutinizer1, scrutinizer2 }) {
  const paperLabel = `${paper.courseCode || ''} ${paper.examType}${paper.catNumber ? ' ' + paper.catNumber : ''}`.trim();
  const recipients = [scrutinizer1, scrutinizer2].filter(u => u?.email);

  for (const user of recipients) {
    await sendNotification({
      to: user.email,
      subject: `Paper "${paperLabel}" forwarded to HOD`,
      html: `
        <p>Hi ${user.username},</p>
        <p>The question paper <strong>${paperLabel}</strong> that you reviewed has been forwarded to the HOD by Panel Member <strong>${panelMemberName}</strong>.</p>
        <p>The paper is now awaiting final HOD approval.</p>
        <br/><p style="color:#888;font-size:12px;">Exam Workflow System</p>
      `,
    });
  }
}

// HOD approved paper → notify panel member
async function notifyPanelOnHodApproval({ paper, hodName, panelMember, comments }) {
  if (!panelMember?.email) return;
  const paperLabel = `${paper.courseCode || ''} ${paper.examType}${paper.catNumber ? ' ' + paper.catNumber : ''}`.trim();

  await sendNotification({
    to: panelMember.email,
    subject: `✅ Paper "${paperLabel}" approved by HOD`,
    html: `
      <p>Hi ${panelMember.username},</p>
      <p>Great news! The question paper <strong>${paperLabel}</strong> you submitted has been <strong>approved by HOD ${hodName}</strong>.</p>
      ${comments ? `<p><strong>HOD Comments:</strong> ${comments}</p>` : ''}
      <p>The workflow is now complete.</p>
      <br/><p style="color:#888;font-size:12px;">Exam Workflow System</p>
    `,
  });
}

// HOD rejected paper → notify panel member
async function notifyPanelOnHodRejection({ paper, hodName, panelMember, comments }) {
  if (!panelMember?.email) return;
  const paperLabel = `${paper.courseCode || ''} ${paper.examType}${paper.catNumber ? ' ' + paper.catNumber : ''}`.trim();

  await sendNotification({
    to: panelMember.email,
    subject: `↩ Paper "${paperLabel}" returned by HOD`,
    html: `
      <p>Hi ${panelMember.username},</p>
      <p>The question paper <strong>${paperLabel}</strong> has been <strong>returned by HOD ${hodName}</strong> for revision.</p>
      ${comments ? `<p><strong>Reason:</strong> ${comments}</p>` : ''}
      <p>Please review and resubmit.</p>
      <br/><p style="color:#888;font-size:12px;">Exam Workflow System</p>
    `,
  });
}

module.exports = { notifyScrutinizersOnPanelSubmit, notifyPanelOnHodApproval, notifyPanelOnHodRejection };
