const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middlewares/auth.middleware');
const { uploadChatAttachment } = require('../../middlewares/chatUpload.middleware');
const ApiError = require('../../utils/apiError');
const ChatService = require('./chat.service');

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

/**
 * @route   POST /api/chat/send-attachment
 * @desc    Send chat attachment file with option for body and starting/joining a conversation
 * @access  Private (parent, student, teacher)
 */
router.post(
  '/send-attachment',
  verifyToken,
  uploadChatAttachment.single('attachment'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new ApiError(400, 'Please select a file to upload');
      }

      const fileUrl = `/uploads/chat/${req.file.filename}`;

      // Call ChatService to create the message in the DB
      const result = await ChatService.sendMessage({
        authUser: req.user,
        payload: {
          conversationId: req.body.conversationId ? Number(req.body.conversationId) : undefined,
          recipientRole: req.body.recipientRole,
          recipientId: req.body.recipientId ? Number(req.body.recipientId) : undefined,
          body: req.body.body || '',
          attachmentUrl: fileUrl,
          attachmentName: req.file.originalname,
          attachmentType: req.file.mimetype,
        },
      });

      // Emit socket events for real-time notification
      const io = req.app.get('io');
      if (io) {
        // Emit new message to all clients in the conversation room
        io.to(result.roomNames.conversation).emit('chat:message:new', {
          conversation: result.conversation,
          message: result.message,
        });

        // Emit list updates to each participant room
        for (const room of result.roomNames.participants) {
          io.to(room).emit('chat:list:update', {
            conversationId: result.conversation.id,
          });
        }
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
