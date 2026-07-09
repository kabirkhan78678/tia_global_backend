const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const AuthModel = require('./auth.model');
const ApiError = require('../../../utils/apiError');
const {
  sendParentWelcomeEmail,
  sendPasswordResetLinkEmail,
  sendStudentRegistrationReceivedEmail,
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
  const studentEmails = new Set();

  for (const student of payload.students || []) {
    if (!ALLOWED_GRADES.includes(student.gradeLevel)) {
      throw new ApiError(
        400,
        `students.gradeLevel must be one of: ${ALLOWED_GRADES.join(', ')}`
      );
    }

    if (!student.email) {
      throw new ApiError(400, 'students.email is required');
    }

    const normalizedEmail = student.email.toLowerCase();

    if (studentEmails.has(normalizedEmail)) {
      throw new ApiError(400, 'Student emails must be unique');
    }

    studentEmails.add(normalizedEmail);

    if (normalizedEmail === String(payload.email || '').toLowerCase()) {
      throw new ApiError(400, 'Student email must be different from parent email');
    }

    const existingUser = await AuthModel.findByEmail(student.email);
    const existingStudent = await AuthModel.findStudentByEmail(student.email);

    if (existingUser || existingStudent) {
      throw new ApiError(400, 'Student email is already registered');
    }
  }

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  const parentId = await AuthModel.createParent({
    ...payload,
    password: hashedPassword,
  });

  for (const student of payload.students || []) {
    const studentId = await AuthModel.createStudent({
      ...student,
      password: null,
    });

    await AuthModel.linkStudent(parentId, studentId);

    await sendSignupEmail(() =>
      sendStudentRegistrationReceivedEmail({
        to: student.email,
        firstName: student.firstName,
      })
    );
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
  if (!payload.email || !payload.password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const user = await AuthModel.findByEmail(payload.email);

  if (user) {
    const match = await bcrypt.compare(payload.password, user.password);

    if (!match) {
      throw new ApiError(400, 'Invalid credentials');
    }

    if (user.approval_status !== 'active') {
      let message = 'Your account is pending admin approval';

      if (user.approval_status === 'inactive') {
        message = 'Your account has been deactivated by admin';
      }

      throw new ApiError(403, message);
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
  }

  const student = await AuthModel.findStudentByEmail(payload.email);

  if (!student || !student.password) {
    throw new ApiError(400, 'Invalid credentials');
  }

  const studentPasswordMatches = await bcrypt.compare(payload.password, student.password);

  if (!studentPasswordMatches) {
    throw new ApiError(400, 'Invalid credentials');
  }

  if (student.status !== 'active') {
    throw new ApiError(403, 'Your account is pending admin approval');
  }

  const parent = await AuthModel.findActiveParentByStudentId(student.id);

  if (!parent || parent.approval_status !== 'active') {
    throw new ApiError(403, 'Parent account is inactive.');
  }

  const isFirstLogin = Boolean(student.is_first_login);

  if (isFirstLogin) {
    await AuthModel.markStudentFirstLogin(student.id);
  }

  const token = jwt.sign(
    {
      id: student.id,
      role: 'student',
    },
    getJwtSecret(),
    { expiresIn: '7d' }
  );

  return {
    token,
    role: 'student',
    isFirstLogin,
    isPasswordGenerated: Boolean(student.is_password_generated),
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
  profileImage: user.profile_image,
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
  email: student.email,
  status: student.status,
  profileImage: student.profile_image,
  isFirstLogin: Boolean(student.is_first_login),
  firstLoginAt: student.first_login_at,
  isPasswordGenerated: Boolean(student.is_password_generated),
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

const getProfile = async (authUser) => {
  if (authUser.role === 'student') {
    const student = await AuthModel.findStudentById(authUser.id);

    if (!student) {
      throw new ApiError(404, 'Student not found');
    }

    return {
      student: formatStudentProfile(student),
    };
  }

  const user = await AuthModel.findById(authUser.id);

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

const getProfileImagePath = (file) => {
  if (!file) {
    return undefined;
  }

  return `/uploads/profiles/${file.filename}`;
};

const updateProfile = async ({ authUser, body, file }) => {
  const profileImage = getProfileImagePath(file);

  if (authUser.role === 'student') {
    if (body.gradeLevel && !ALLOWED_GRADES.includes(body.gradeLevel)) {
      throw new ApiError(
        400,
        `gradeLevel must be one of: ${ALLOWED_GRADES.join(', ')}`
      );
    }

    const student = await AuthModel.findStudentById(authUser.id);

    if (!student) {
      throw new ApiError(404, 'Student not found');
    }

    await AuthModel.updateStudentProfile({
      studentId: authUser.id,
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        dob: body.dob,
        gradeLevel: body.gradeLevel,
        profileImage,
      },
    });

    return getProfile(authUser);
  }

  const user = await AuthModel.findById(authUser.id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  await AuthModel.updateUserProfile({
    userId: authUser.id,
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      profileImage,
    },
  });

  if (user.role === 'teacher') {
    if (body.teachingGrade && !ALLOWED_GRADES.includes(body.teachingGrade)) {
      throw new ApiError(
        400,
        `teachingGrade must be one of: ${ALLOWED_GRADES.join(', ')}`
      );
    }

    await AuthModel.updateTeacherProfile({
      userId: authUser.id,
      data: {
        qualification: body.qualification,
        specialization: body.specialization,
        experienceYears: body.experienceYears,
        teachingGrade: body.teachingGrade,
      },
    });
  }

  return getProfile(authUser);
};

const changePassword = async ({ authUser, oldPassword, newPassword }) => {
  if (!oldPassword || !newPassword) {
    throw new ApiError(400, 'oldPassword and newPassword are required');
  }

  if (authUser.role === 'student') {
    const student = await AuthModel.findStudentById(authUser.id);

    if (!student || !student.password) {
      throw new ApiError(404, 'Student not found');
    }

    const match = await bcrypt.compare(oldPassword, student.password);

    if (!match) {
      throw new ApiError(400, 'Old password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await AuthModel.updateStudentPassword({
      studentId: authUser.id,
      password: hashedPassword,
    });

    return {
      message: 'Password changed successfully',
    };
  }

  const user = await AuthModel.findById(authUser.id);

  if (!user || !user.password) {
    throw new ApiError(404, 'User not found');
  }

  const match = await bcrypt.compare(oldPassword, user.password);

  if (!match) {
    throw new ApiError(400, 'Old password is incorrect');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await AuthModel.updateUserPassword({
    userId: authUser.id,
    password: hashedPassword,
  });

  return {
    message: 'Password changed successfully',
  };
};

const changeStudentPassword = async ({ studentId, role, oldPassword, newPassword }) => {
  return changePassword({
    authUser: {
      id: studentId,
      role,
    },
    oldPassword,
    newPassword,
  });
};

const createStudentPassword = async ({ studentId, role, password }) => {
  if (role !== 'student') {
    throw new ApiError(403, 'Only students can create student password');
  }

  if (!password) {
    throw new ApiError(400, 'password is required');
  }

  const student = await AuthModel.findStudentById(studentId);

  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  if (student.status !== 'active') {
    throw new ApiError(403, 'Student account is not active');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await AuthModel.createStudentPassword({
    studentId,
    password: hashedPassword,
  });

  return {
    message: 'Student password created successfully',
    isPasswordGenerated: true,
  };
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
  updateProfile,
  changePassword,
  changeStudentPassword,
  createStudentPassword,
  forgotPassword,
  resetPassword,
};
