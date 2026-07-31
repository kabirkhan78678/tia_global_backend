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

exports.getParentHandbooks = async (parentId, studentId = null) => {
  // If a specific student ID is provided, retrieve for that child with strict checks
  if (studentId) {
    const student = await AuthModel.findStudentByParentIdAndStudentId({
      parentId,
      studentId,
    });

    if (!student) {
      throw new ApiError(404, 'Student not found or not linked to this parent account');
    }

    if (student.status !== 'active') {
      throw new ApiError(403, 'Student account is not active');
    }

    const gradeLevel = student.grade_level;
    if (!gradeLevel) {
      throw new ApiError(400, 'No grade level assigned to this student profile');
    }

    return await HandbookModel.getHandbooksByGrade(gradeLevel);
  }

  // If no student ID is provided, retrieve for all linked active students
  const students = await AuthModel.findStudentsByParentId(parentId);
  if (!students || students.length === 0) {
    return [];
  }

  const allHandbooks = [];
  const seenHandbookIds = new Set();

  for (const student of students) {
    if (student.status !== 'active') {
      continue;
    }

    const gradeLevel = student.grade_level;
    if (gradeLevel) {
      const handbooks = await HandbookModel.getHandbooksByGrade(gradeLevel);
      for (const h of handbooks) {
        if (!seenHandbookIds.has(h.id)) {
          seenHandbookIds.add(h.id);
          allHandbooks.push(h);
        }
      }
    }
  }

  return allHandbooks;
};
