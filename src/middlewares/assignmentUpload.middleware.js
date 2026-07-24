const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ApiError = require('../utils/apiError');

const assignmentUploadDir = path.join(__dirname, '../../public/uploads/assignments');

fs.mkdirSync(assignmentUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, assignmentUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBasename = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `${Date.now()}-${cleanBasename}${ext}`;

    cb(null, fileName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.webp', '.zip'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return cb(new ApiError(400, `File type ${ext} is not allowed. Allowed types: ${allowedExtensions.join(', ')}`));
  }

  return cb(null, true);
};

const uploadAssignmentFile = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

module.exports = {
  uploadAssignmentFile,
};
