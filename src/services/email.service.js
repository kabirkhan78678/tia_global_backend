const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const env = require('../config/env');

const logoPath = path.join(__dirname, '../../public/Tarbiytul ilm logo 1.png');

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

const sendEmail = async ({ to, subject, text, html, attachments = [] }) => {
  console.log(`\n\x1b[33m[EMAIL] Initializing email dispatch...\x1b[0m`);
  console.log(`  Recipient : ${to}`);
  console.log(`  Subject   : ${subject}`);

  if (!isSmtpConfigured()) {
    console.warn(`\x1b[31m[EMAIL] [WARNING] SMTP is not fully configured!\x1b[0m`);
    console.log(`  Config check: host="${env.smtp.host}", user="${env.smtp.user}", hasPassword=${!!env.smtp.password}, from="${env.smtp.from}"`);
    return;
  }

  const transporter = createTransporter();

  const allAttachments = [...attachments];
  if (fs.existsSync(logoPath)) {
    allAttachments.push({
      filename: 'logo.png',
      path: logoPath,
      cid: 'tialogo',
    });
  }

  try {
    const info = await transporter.sendMail({
      from: env.smtp.from,
      to,
      subject,
      text,
      html,
      attachments: allAttachments,
    });
    console.log(`\x1b[32m[EMAIL] [SUCCESS] Email sent successfully!\x1b[0m`);
    console.log(`  Message ID: ${info.messageId}`);
    if (info.response) {
      console.log(`  Response  : ${info.response}`);
    }
    console.log('');
  } catch (error) {
    console.error(`\x1b[31m[EMAIL] [ERROR] Failed to send email to ${to}!\x1b[0m`);
    console.error(`  Error Message: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    console.log('');
    throw error;
  }
};

const sendParentWelcomeEmail = async ({ to, firstName, students = [] }) => {
  const studentNames = students
    .map((student) => `${student.firstName || ''} ${student.lastName || ''}`.trim())
    .filter(Boolean);

  const studentLines = studentNames.length
    ? studentNames.map((name) => `- ${name}`).join('\n')
    : '- Student profile';

  const studentItems = studentNames.length
    ? studentNames.map((name) => `<li>${name}</li>`).join('')
    : '<li>Student profile</li>';

  await sendEmail({
    to,
    subject: 'Registration Received',
    text: `Hello ${firstName || 'Parent'},

Thank you for registering.

Your account is pending admin approval.

Students added:
${studentLines}

Team TIA Global`,
    html: `
      <p>Hello ${firstName || 'Parent'},</p>
      <p>Thank you for registering.</p>
      <p>Your account is pending admin approval.</p>
      <p>Students added:</p>
      <ul>${studentItems}</ul>
      <p>Team TIA Global</p>
    `,
  });
};

const sendStudentRegistrationReceivedEmail = async ({ to, firstName }) => {
  await sendEmail({
    to,
    subject: 'Registration Received',
    text: `Hello ${firstName || 'Student'},

Your account has been registered.

It is currently pending admin approval.

Once approved, you'll receive login credentials.

Team TIA Global`,
    html: `
      <p>Hello ${firstName || 'Student'},</p>
      <p>Your account has been registered.</p>
      <p>It is currently pending admin approval.</p>
      <p>Once approved, you'll receive login credentials.</p>
      <p>Team TIA Global</p>
    `,
  });
};

const sendStudentApprovedEmail = async ({ to, password }) => {
  await sendEmail({
    to,
    subject: 'Student Account Approved',
    text: `Hello,

Your account has been approved.

Login Email:
${to}

Temporary Password:
${password}

Please change your password after first login.

Team TIA Global`,
    html: `
      <p>Hello,</p>
      <p>Your account has been approved.</p>
      <p>Login Email:<br>${to}</p>
      <p>Temporary Password:<br>${password}</p>
      <p>Please change your password after first login.</p>
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
  const formattedExpiry = new Date(expiryText).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  await sendEmail({
    to,
    subject: 'Reset Your TIA Global Password',
    text: `Hi,

Use this link to change your password:
${resetUrl}

This link will expire at: ${formattedExpiry}

If you did not request this, please ignore this email.

Team TIA Global`,
    html: `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fbf5ee; padding: 40px 10px; margin: 0; min-height: 100%;">
        <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03); border: 1px solid #e5e7eb;">
          <div style="padding: 25px 30px; border-bottom: 1px solid #f3f4f6; background-color: #ffffff;">
            <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="vertical-align: middle; width: 48px; padding: 0;">
                  <img src="cid:tialogo" alt="TIA Global" style="max-height: 48px; width: 48px; display: block; border: 0;" />
                </td>
                <td style="vertical-align: middle; padding: 0 0 0 12px; text-align: left;">
                  <span style="font-size: 28px; font-weight: 700; color: #ff7a00; letter-spacing: -0.5px; line-height: 1;">TIA Global</span>
                </td>
              </tr>
            </table>
          </div>
          <div style="padding: 40px 30px; color: #374151; line-height: 1.6;">
            <h2 style="font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 20px; color: #111827; letter-spacing: -0.3px;">Password Reset Request</h2>
            <p style="margin: 0 0 15px 0; font-size: 16px;">Hi,</p>
            <p style="margin: 0 0 25px 0; font-size: 16px; color: #4b5563;">We received a request to reset the password for your TIA Global account. Click the button below to set a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; background-color: #ff7a00; color: #ffffff !important; text-decoration: none; padding: 14px 36px; font-size: 16px; font-weight: 600; border-radius: 25px; border: 1px solid #e66e00; box-shadow: 0 4px 6px rgba(255, 122, 0, 0.15);">Reset Password</a>
            </div>
            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 4px; font-size: 14px; color: #78350f;">
              <strong>Important:</strong> This reset link will expire on <strong>${formattedExpiry}</strong>.
            </div>
            <p style="margin: 25px 0 0 0; font-size: 15px; color: #6b7280;">If you did not request this password reset, you can safely ignore this email. Your password will remain secure and unchanged.</p>
            <p style="margin: 25px 0 0 0; font-size: 16px; color: #1f2937;">Best regards,<br><strong style="color: #ff7a00;">Team TIA Global</strong></p>
          </div>
          <div style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #f3f4f6; font-size: 13px; color: #9ca3af;">
            <p style="margin: 0 0 5px 0; font-weight: 600; color: #6b7280;">Tia Tarbiyatul ILM Academy Global</p>
            <p style="margin: 0;">This is an automated security notification. Please do not reply directly to this email.</p>
          </div>
        </div>
      </div>
    `,
  });
};

const sendAdminPasswordResetLinkEmail = async ({ to, token, expiresAt }) => {
  const resetUrl = `${env.frontend.resetPasswordUrl}?token=${token}&type=admin`;
  const expiryText =
    expiresAt instanceof Date ? expiresAt.toISOString() : new Date(expiresAt).toISOString();
  const formattedExpiry = new Date(expiryText).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  await sendEmail({
    to,
    subject: 'Reset Your TIA Global Admin Password',
    text: `Hi Admin,

Use this link to reset your admin password:
${resetUrl}

This link will expire at: ${formattedExpiry}

If you did not request this, please ignore this email.

Team TIA Global`,
    html: `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fbf5ee; padding: 40px 10px; margin: 0; min-height: 100%;">
        <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03); border: 1px solid #e5e7eb;">
          <div style="padding: 25px 30px; border-bottom: 1px solid #f3f4f6; background-color: #ffffff;">
            <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="vertical-align: middle; width: 48px; padding: 0;">
                  <img src="cid:tialogo" alt="TIA Global" style="max-height: 48px; width: 48px; display: block; border: 0;" />
                </td>
                <td style="vertical-align: middle; padding: 0 0 0 12px; text-align: left;">
                  <span style="font-size: 28px; font-weight: 700; color: #ff7a00; letter-spacing: -0.5px; line-height: 1;">TIA Global Admin</span>
                </td>
              </tr>
            </table>
          </div>
          <div style="padding: 40px 30px; color: #374151; line-height: 1.6;">
            <h2 style="font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 20px; color: #111827; letter-spacing: -0.3px;">Admin Password Reset</h2>
            <p style="margin: 0 0 15px 0; font-size: 16px;">Hi Admin,</p>
            <p style="margin: 0 0 25px 0; font-size: 16px; color: #4b5563;">We received a request to reset your TIA Global Admin account password. Click the button below to set a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; background-color: #ff7a00; color: #ffffff !important; text-decoration: none; padding: 14px 36px; font-size: 16px; font-weight: 600; border-radius: 25px; border: 1px solid #e66e00; box-shadow: 0 4px 6px rgba(255, 122, 0, 0.15);">Reset Admin Password</a>
            </div>
            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 4px; font-size: 14px; color: #78350f;">
              <strong>Important:</strong> This reset link will expire on <strong>${formattedExpiry}</strong>.
            </div>
            <p style="margin: 25px 0 0 0; font-size: 15px; color: #6b7280;">If you did not request this password reset, you can safely ignore this email. Your admin account password will remain secure and unchanged.</p>
            <p style="margin: 25px 0 0 0; font-size: 16px; color: #1f2937;">Best regards,<br><strong style="color: #ff7a00;">Team TIA Global</strong></p>
          </div>
          <div style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #f3f4f6; font-size: 13px; color: #9ca3af;">
            <p style="margin: 0 0 5px 0; font-weight: 600; color: #6b7280;">Tia Tarbiyatul ILM Academy Global</p>
            <p style="margin: 0;">This is an automated security notification. Please do not reply directly to this email.</p>
          </div>
        </div>
      </div>
    `,
  });
};

module.exports = {
  sendAdminPasswordResetLinkEmail,
  sendParentWelcomeEmail,
  sendPasswordResetLinkEmail,
  sendStudentApprovedEmail,
  sendStudentRegistrationReceivedEmail,
  sendTeacherWelcomeEmail,
};
