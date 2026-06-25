const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const AuthModel = require('./auth.model');
const ApiError = require('../../../utils/apiError');
const {
  sendParentWelcomeEmail,
  sendPasswordResetLinkEmail,
  sendTeacherWelcomeEmail,
} = require('../../../services/email.service');

const ALLOWED_GRADES = [
  'Pre-K',
  'Kindergarten',
  '1st Grade',
  '2nd Grade',
  '3rd Grade',
  '4th Grade',
];

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new ApiError(500, 'JWT_SECRET is missing in .env');
  }

  return process.env.JWT_SECRET;
};

const sendSignupEmail = async (sendEmail) => {
  try {
    await sendEmail();
  } catch (error) {
    console.error('Signup email failed:', error.message);
  }
};

const signupParent = async (payload) => {
  for (const student of payload.students || []) {
    if (!ALLOWED_GRADES.includes(student.gradeLevel)) {
      throw new ApiError(
        400,
        `students.gradeLevel must be one of: ${ALLOWED_GRADES.join(', ')}`
      );
    }
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  const parentId = await AuthModel.createParent({
    ...payload,
    password: hashedPassword,
  });

  for (const student of payload.students || []) {
    const username = `STD${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const studentPassword = Math.random().toString(36).slice(-8);
    const hashedStudentPassword = await bcrypt.hash(studentPassword, 10);

    const studentId = await AuthModel.createStudent({
      ...student,
      username,
      password: hashedStudentPassword,
    });

    await AuthModel.linkStudent(parentId, studentId);
  }

  await sendSignupEmail(() =>
    sendParentWelcomeEmail({
      to: payload.email,
      firstName: payload.firstName,
      students: payload.students,
    })
  );

  return {
    message: 'Registration submitted successfully',
  };
};

const signupTeacher = async (payload) => {
  if (!ALLOWED_GRADES.includes(payload.teachingGrade)) {
    throw new ApiError(
      400,
      `teachingGrade must be one of: ${ALLOWED_GRADES.join(', ')}`
    );
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  const teacherId = await AuthModel.createTeacherUser({
    ...payload,
    password: hashedPassword,
  });

  await AuthModel.createTeacherProfile({
    userId: teacherId,
    qualification: payload.qualification,
    specialization: payload.specialization,
    experienceYears: payload.experienceYears,
    teachingGrade: payload.teachingGrade,
  });

  await sendSignupEmail(() =>
    sendTeacherWelcomeEmail({
      to: payload.email,
      firstName: payload.firstName,
      teachingGrade: payload.teachingGrade,
    })
  );

  return {
    message: 'Teacher registered successfully',
  };
};

const signup = async (payload) => {
  if (!payload.role) {
    throw new ApiError(400, 'Role is required');
  }

  if (payload.role === 'parent') {
    return signupParent(payload);
  }

  if (payload.role === 'teacher') {
    return signupTeacher(payload);
  }

  throw new ApiError(400, 'Invalid role');
};

const login = async (payload) => {
  const user = await AuthModel.findByEmail(payload.email);

  if (!user) {
    throw new ApiError(400, 'Invalid credentials');
  }

  const match = await bcrypt.compare(payload.password, user.password);

  if (!match) {
    throw new ApiError(400, 'Invalid credentials');
  }

  if (user.approval_status !== 'approved') {
    throw new ApiError(
      403,
      user.approval_status === 'rejected'
        ? 'Your account has been rejected by admin'
        : 'Your account is pending admin approval'
    );
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: '7d' }
  );

  return {
    token,
    role: user.role,
  };
};

const formatUserProfile = (user) => ({
  id: user.id,
  role: user.role,
  firstName: user.first_name,
  lastName: user.last_name,
  fullName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
  phone: user.phone,
  email: user.email,
  approvalStatus: user.approval_status,
  createdAt: user.created_at,
});

const formatTeacherProfile = (profile) => {
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    qualification: profile.qualification,
    specialization: profile.specialization,
    experienceYears: profile.experience_years,
    teachingGrade: profile.teaching_grade,
  };
};

const formatStudentProfile = (student) => ({
  id: student.id,
  firstName: student.first_name,
  lastName: student.last_name,
  fullName: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
  dob: student.dob,
  gradeLevel: student.grade_level,
  username: student.username,
});

const buildStudentSummary = (students) => {
  const gradeCounts = students.reduce((summary, student) => {
    const grade = student.gradeLevel || 'Unassigned';
    summary[grade] = (summary[grade] || 0) + 1;
    return summary;
  }, {});

  return {
    totalStudents: students.length,
    hasMultipleStudents: students.length > 1,
    gradeCounts,
  };
};

const getProfile = async (userId) => {
  const user = await AuthModel.findById(userId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const profile = {
    user: formatUserProfile(user),
  };

  if (user.role === 'teacher') {
    const teacherProfile = await AuthModel.findTeacherProfileByUserId(user.id);

    return {
      ...profile,
      teacherProfile: formatTeacherProfile(teacherProfile),
    };
  }

  if (user.role === 'parent') {
    const students = await AuthModel.findStudentsByParentId(user.id);
    const formattedStudents = students.map(formatStudentProfile);

    return {
      ...profile,
      students: formattedStudents,
      studentSummary: buildStudentSummary(formattedStudents),
    };
  }

  return profile;
};

const forgotPassword = async (payload) => {
  if (!payload.email) {
    throw new ApiError(400, 'Email is required');
  }

  const user = await AuthModel.findByEmail(payload.email);

  if (!user) {
    return {
      message: 'If this email exists, a reset link has been sent',
    };
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await AuthModel.createPasswordResetRequest({
    userId: user.id,
    email: user.email,
    token,
    expiresAt,
  });

  await sendSignupEmail(() =>
    sendPasswordResetLinkEmail({
      to: user.email,
      token,
      expiresAt,
    })
  );

  return {
    message: 'If this email exists, a reset link has been sent',
  };
};

const resetPassword = async (payload) => {
  if (!payload.token || !payload.password) {
    throw new ApiError(400, 'Token and password are required');
  }

  const resetRequest = await AuthModel.findPasswordResetRequestByToken(payload.token);

  if (!resetRequest) {
    throw new ApiError(400, 'Invalid reset token');
  }

  if (new Date(resetRequest.expires_at).getTime() <= Date.now()) {
    throw new ApiError(400, 'Reset token has expired');
  }

  if (resetRequest.status !== 'pending') {
    throw new ApiError(400, 'Reset token is already used or expired');
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  await AuthModel.updateUserPassword({
    userId: resetRequest.user_id,
    password: hashedPassword,
  });
  await AuthModel.markPasswordResetRequestUsed(payload.token);

  return {
    message: 'Password reset successfully',
  };
};

module.exports = {
  signup,
  login,
  getProfile,
  forgotPassword,
  resetPassword,
};
