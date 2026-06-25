const nodemailer = require('nodemailer');
const env = require('../config/env');

const isSmtpConfigured = () =>
  Boolean(env.smtp.host && env.smtp.user && env.smtp.password && env.smtp.from);

const createTransporter = () =>
  nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    requireTLS: env.smtp.port === 587,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.password,
    },
    tls: {
      servername: env.smtp.host,
    },
  });

const sendEmail = async ({ to, subject, text, html }) => {
  if (!isSmtpConfigured()) {
    console.warn('SMTP is not configured. Skipping email:', subject);
    return;
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: env.smtp.from,
    to,
    subject,
    text,
    html,
  });
};

const sendParentWelcomeEmail = async ({ to, firstName, students = [] }) => {
  const studentNames = students
    .map((student) => `${student.firstName || ''} ${student.lastName || ''}`.trim())
    .filter(Boolean);

  const studentLine = studentNames.length
    ? `Student(s): ${studentNames.join(', ')}`
    : 'Your student profile';

  await sendEmail({
    to,
    subject: 'Welcome to TIA Global - Registration Under Review',
    text: `Hi ${firstName || 'Parent'},

Welcome to TIA Global.

We have received your registration successfully. ${studentLine} is currently under admin review.

What happens next:
1. Our admin team will review the submitted details.
2. After approval, your student account will be activated.
3. You will receive the next steps and login details once the review is completed.

Thank you for choosing TIA Global.

Team TIA Global`,
    html: `
      <p>Hi ${firstName || 'Parent'},</p>
      <p>Welcome to <strong>TIA Global</strong>.</p>
      <p>We have received your registration successfully. <strong>${studentLine}</strong> is currently under admin review.</p>
      <p><strong>What happens next:</strong></p>
      <ol>
        <li>Our admin team will review the submitted details.</li>
        <li>After approval, your student account will be activated.</li>
        <li>You will receive the next steps and login details once the review is completed.</li>
      </ol>
      <p>Thank you for choosing TIA Global.</p>
      <p>Team TIA Global</p>
    `,
  });
};

const sendTeacherWelcomeEmail = async ({ to, firstName, teachingGrade }) => {
  const gradeLine = teachingGrade
    ? `Selected teaching grade: ${teachingGrade}`
    : 'Selected teaching grade is under review';

  await sendEmail({
    to,
    subject: 'Welcome to TIA Global - Teacher Profile Under Review',
    text: `Hi ${firstName || 'Teacher'},

Welcome to TIA Global.

Your teacher registration has been submitted successfully and is currently under admin review.

${gradeLine}

What happens next:
1. Our admin team will verify your profile, qualification, specialization, and experience details.
2. After approval, your teacher account will be activated.
3. You will receive confirmation and next steps once the review is completed.

Thank you for joining TIA Global.

Team TIA Global`,
    html: `
      <p>Hi ${firstName || 'Teacher'},</p>
      <p>Welcome to <strong>TIA Global</strong>.</p>
      <p>Your teacher registration has been submitted successfully and is currently under admin review.</p>
      <p><strong>${gradeLine}</strong></p>
      <p><strong>What happens next:</strong></p>
      <ol>
        <li>Our admin team will verify your profile, qualification, specialization, and experience details.</li>
        <li>After approval, your teacher account will be activated.</li>
        <li>You will receive confirmation and next steps once the review is completed.</li>
      </ol>
      <p>Thank you for joining TIA Global.</p>
      <p>Team TIA Global</p>
    `,
  });
};

const sendPasswordResetLinkEmail = async ({ to, token, expiresAt }) => {
  const resetUrl = `${env.frontend.resetPasswordUrl}?token=${token}`;
  const expiryText =
    expiresAt instanceof Date ? expiresAt.toISOString() : new Date(expiresAt).toISOString();

  await sendEmail({
    to,
    subject: 'Reset Your TIA Global Password',
    text: `Hi,

Use this link to change your password:
${resetUrl}

This link will expire at: ${expiryText}

If you did not request this, please ignore this email.

Team TIA Global`,
    html: `
      <p>Hi,</p>
      <p><a href="${resetUrl}">Click here to change your password</a></p>
      <p>This link will expire at: ${expiryText}</p>
      <p>If you did not request this, please ignore this email.</p>
      <p>Team TIA Global</p>
    `,
  });
};

const sendAdminPasswordResetLinkEmail = async ({ to, token, expiresAt }) => {
  const resetUrl = `${env.frontend.resetPasswordUrl}?token=${token}&type=admin`;
  const expiryText =
    expiresAt instanceof Date ? expiresAt.toISOString() : new Date(expiresAt).toISOString();

  await sendEmail({
    to,
    subject: 'Reset Your TIA Global Admin Password',
    text: `Hi Admin,

Use this link to reset your admin password:
${resetUrl}

This link will expire at: ${expiryText}

If you did not request this, please ignore this email.

Team TIA Global`,
    html: `
      <p>Hi Admin,</p>
      <p>Use this link to reset your admin password:</p>
      <p><a href="${resetUrl}">Reset admin password</a></p>
      <p>This link will expire at: ${expiryText}</p>
      <p>If you did not request this, please ignore this email.</p>
      <p>Team TIA Global</p>
    `,
  });
};

module.exports = {
  sendAdminPasswordResetLinkEmail,
  sendParentWelcomeEmail,
  sendPasswordResetLinkEmail,
  sendTeacherWelcomeEmail,
};
