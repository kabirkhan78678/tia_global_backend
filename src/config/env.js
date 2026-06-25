require('dotenv').config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tiaglobal',
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure:
      process.env.SMTP_SECURE === 'true' ||
      Number(process.env.SMTP_PORT) === 465,
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD
      ? process.env.SMTP_PASSWORD.replace(/\s/g, '')
      : undefined,
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
  },
  admin: {
    email: process.env.ADMIN_EMAIL,
    resetApprovalSecret: process.env.ADMIN_RESET_APPROVAL_SECRET,
    jwtSecret: process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET,
  },
  frontend: {
    resetPasswordUrl:
      process.env.FRONTEND_RESET_PASSWORD_URL ||
      `http://localhost:${Number(process.env.PORT) || 5000}/reset-password`,
  },
};
