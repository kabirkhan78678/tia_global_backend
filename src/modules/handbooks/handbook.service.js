const HandbookModel = require('./handbook.model');
const AuthModel = require('../users/auth/auth.model');
const PaymentModel = require('../payment/payment.model');
const ApiError = require('../../utils/apiError');

exports.addHandbook = async ({ title, grade_level, file }) => {
  if (!title || !title.trim()) {
    throw new ApiError(400, 'Handbook title is required');
  }
  if (!grade_level || !grade_level.trim()) {
    throw new ApiError(400, 'Grade level is required');
  }
  if (!file) {
    throw new ApiError(400, 'Handbook PDF file is required');
  }

  const fileUrl = `/uploads/handbooks/${file.filename}`;
  const handbookId = await HandbookModel.createHandbook({
    title: title.trim(),
    grade_level: grade_level.trim(),
    file_url: fileUrl,
    file_name: file.originalname,
  });

  return await HandbookModel.getHandbookById(handbookId);
};

exports.deleteHandbook = async (id) => {
  const exists = await HandbookModel.getHandbookById(id);
  if (!exists) {
    throw new ApiError(404, 'Handbook not found');
  }

  // Delete file from filesystem
  const fs = require('fs');
  const path = require('path');
  const localFilePath = path.join(__dirname, '../../../public', exists.file_url);
  try {
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
  } catch (err) {
    console.warn(`Could not delete file ${localFilePath}:`, err.message);
  }

  await HandbookModel.deleteHandbook(id);
  return { success: true, message: 'Handbook deleted successfully' };
};

exports.getAdminHandbooks = async () => {
  return await HandbookModel.getAllHandbooks();
};

exports.getStudentHandbooks = async (studentId) => {
  // 1. Get student profile details
  const student = await AuthModel.findStudentById(studentId);
  if (!student) {
    throw new ApiError(404, 'Student profile not found');
  }

  // 2. Check if student has a paid invoice (outstanding fees check)
  const isFeePaid = await PaymentModel.hasPaidInvoice(studentId);
  if (!isFeePaid) {
    throw new ApiError(
      403,
      'Access denied. Please complete your fee payment to view handbooks.'
    );
  }

  // 3. Fetch handbooks matching student's grade level
  const gradeLevel = student.grade_level;
  if (!gradeLevel) {
    throw new ApiError(400, 'No grade level assigned to this student profile');
  }

  return await HandbookModel.getHandbooksByGrade(gradeLevel);
};
