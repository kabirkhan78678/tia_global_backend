const fs = require('fs');
const path = require('path');
const multer = require('multer');
const ApiError = require('../utils/apiError');

const profileUploadDir = path.join(__dirname, '../../public/uploads/profiles');

fs.mkdirSync(profileUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profileUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    cb(null, fileName);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new ApiError(400, 'Only image files are allowed'));
  }

  return cb(null, true);
};

const uploadProfileImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

module.exports = {
  uploadProfileImage,
};
