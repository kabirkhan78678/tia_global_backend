const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middlewares/auth.middleware');
const { uploadChatAttachment } = require('../../middlewares/chatUpload.middleware');
const ApiError = require('../../utils/apiError');

/**
 * @route   POST /api/chat/upload
 * @desc    Upload chat attachment file
 * @access  Private (parent, student, teacher)
 */
router.post(
  '/upload',
  verifyToken,
  uploadChatAttachment.single('attachment'),
  (req, res, next) => {
    try {
      if (!req.file) {
        throw new ApiError(400, 'Please select a file to upload');
      }

      // Generate local path relative to public folder
      const fileUrl = `/uploads/chat/${req.file.filename}`;

      res.status(200).json({
        success: true,
        data: {
          url: fileUrl,
          name: req.file.originalname,
          type: req.file.mimetype,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
