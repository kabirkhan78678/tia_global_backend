const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ApiError = require('../utils/apiError');

// Ensure destination directory exists
const handbookUploadDir = path.join(__dirname, '../../public/uploads/handbooks');
fs.mkdirSync(handbookUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, handbookUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBasename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${Date.now()}-${cleanBasename}${ext}`;
    cb(null, fileName);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ext !== '.pdf' || file.mimetype !== 'application/pdf') {
    return cb(
      new ApiError(
        400,
        `Only PDF files are allowed. File type ${ext} is not allowed.`
      )
    );
  }

  return cb(null, true);
};

const uploadHandbook = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
});

module.exports = {
  uploadHandbook,
};
