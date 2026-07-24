const bcrypt = require('bcrypt');
const crypto = require('crypto');

const ApiError = require('../../../utils/apiError');
const AdminUsersModel = require('./admin.users.model');
const InvoiceService = require('../../../services/invoice.service');
const { sendStudentApprovedEmail } = require('../../../services/email.service');

const ALLOWED_ROLES = ['parent', 'teacher'];
const ALLOWED_APPROVAL_STATUSES = ['pending', 'active', 'inactive'];

const generateTemporaryPassword = () =>
  crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 10);

const sendAdminEmail = async (sendEmail) => {
  try {
    await sendEmail();
  } catch (error) {
    console.error('Admin user email failed:', error.message);
  }
};

const triggerStudentInvoice = async (studentId) => {
  try {
    await InvoiceService.generateInvoiceForStudent(studentId);
  } catch (error) {
    console.error(`Failed to generate automatic invoice for student ${studentId}:`, error.message);
  }
};

const formatTeacher = (teacher) => ({
  id: teacher.id,
  role: teacher.role,
  firstName: teacher.first_name,
  lastName: teacher.last_name,
  fullName: `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim(),
  phone: teacher.phone,
  email: teacher.email,
  profileImage: teacher.profile_image,
  approvalStatus: teacher.approval_status,
  createdAt: teacher.created_at,
  teacherProfile: {
    qualification: teacher.qualification,
    specialization: teacher.specialization,
    experienceYears: teacher.experience_years,
    teachingGrade: teacher.teaching_grade,
  },
});

const formatStudent = (student) => ({
  id: student.student_id,
  firstName: student.student_first_name,
  lastName: student.student_last_name,
  fullName: `${student.student_first_name || ''} ${student.student_last_name || ''}`.trim(),
  dob: student.dob,
  gradeLevel: student.grade_level,
  academy: student.academy,
  email: student.student_email,
  status: student.student_status,
  profileImage: student.student_profile_image,
  isFirstLogin: Boolean(student.is_first_login),
  firstLoginAt: student.first_login_at,
  isPasswordGenerated: Boolean(student.is_password_generated),
});

const groupParentsWithStudents = (rows) => {
  const parents = new Map();

  for (const row of rows) {
    if (!parents.has(row.parent_id)) {
      parents.set(row.parent_id, {
        id: row.parent_id,
        role: row.role,
        firstName: row.parent_first_name,
        lastName: row.parent_last_name,
        fullName: `${row.parent_first_name || ''} ${row.parent_last_name || ''}`.trim(),
        phone: row.phone,
        email: row.email,
        profileImage: row.parent_profile_image,
        approvalStatus: row.approval_status,
        createdAt: row.parent_created_at,
        students: [],
      });
    }

    if (row.student_id) {
      parents.get(row.parent_id).students.push(formatStudent(row));
    }
  }

  return Array.from(parents.values()).map((parent) => ({
    ...parent,
    studentSummary: {
      totalStudents: parent.students.length,
      hasMultipleStudents: parent.students.length > 1,
    },
  }));
};

const getTeachers = async () => {
  const teachers = await AdminUsersModel.findAllTeachers();

  return {
    teachers: teachers.map(formatTeacher),
  };
};

const getParents = async () => {
  const parents = await AdminUsersModel.findAllParents();

  return {
    parents: groupParentsWithStudents(parents),
  };
};

const activateParentChildren = async (parentId) => {
  const students = await AdminUsersModel.findStudentsByParentId(parentId);
  for (const student of students) {
    if (student.status !== 'active' || !student.password) {
      const temporaryPassword = generateTemporaryPassword();
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      await AdminUsersModel.updateStudentApproval({
        studentId: student.id,
        status: 'active',
        password: hashedPassword,
      });

      await triggerStudentInvoice(student.id);

      await sendAdminEmail(() =>
        sendStudentApprovedEmail({
          to: student.email,
          password: temporaryPassword,
        })
      );
    }
  }
};

const updateApprovalStatus = async ({ userId, role, status }) => {
  if (!ALLOWED_ROLES.includes(role)) {
    throw new ApiError(400, `role must be one of: ${ALLOWED_ROLES.join(', ')}`);
  }

  if (!ALLOWED_APPROVAL_STATUSES.includes(status)) {
    throw new ApiError(
      400,
      `status must be one of: ${ALLOWED_APPROVAL_STATUSES.join(', ')}`
    );
  }

  const user = await AdminUsersModel.findUserByIdAndRole({ userId, role });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  await AdminUsersModel.updateApprovalStatus({ userId, role, status });

  if (role === 'parent' && status === 'active') {
    await activateParentChildren(userId);
  }

  return {
    message: `${role} ${status} successfully`,
  };
};

const updateParentStatus = async ({ parentId, status }) => {
  if (!ALLOWED_APPROVAL_STATUSES.includes(status)) {
    throw new ApiError(
      400,
      `status must be one of: ${ALLOWED_APPROVAL_STATUSES.join(', ')}`
    );
  }

  const parent = await AdminUsersModel.findUserByIdAndRole({
    userId: parentId,
    role: 'parent',
  });

  if (!parent) {
    throw new ApiError(404, 'Parent not found');
  }

  await AdminUsersModel.updateApprovalStatus({
    userId: parentId,
    role: 'parent',
    status,
  });

  if (status === 'active') {
    await activateParentChildren(parentId);
  }

  return {
    message: `parent ${status} successfully`,
  };
};

const updateStudentStatus = async ({ studentId, status }) => {
  if (!ALLOWED_APPROVAL_STATUSES.includes(status)) {
    throw new ApiError(
      400,
      `status must be one of: ${ALLOWED_APPROVAL_STATUSES.join(', ')}`
    );
  }

  const student = await AdminUsersModel.findStudentById(studentId);

  if (!student) {
    throw new ApiError(404, 'Student not found');
  }

  if (status === 'active') {
    if (student.status !== 'active' || !student.password) {
      const temporaryPassword = generateTemporaryPassword();
      const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

      await AdminUsersModel.updateStudentApproval({
        studentId,
        status,
        password: hashedPassword,
      });

      await triggerStudentInvoice(studentId);

      await sendAdminEmail(() =>
        sendStudentApprovedEmail({
          to: student.email,
          password: temporaryPassword,
        })
      );
    } else {
      await AdminUsersModel.updateStudentStatus({ studentId, status });
      await triggerStudentInvoice(studentId);
    }

    const parent = await AdminUsersModel.findParentByStudentId(studentId);
    if (parent && parent.approval_status !== 'active') {
      await AdminUsersModel.updateApprovalStatus({
        userId: parent.id,
        role: 'parent',
        status: 'active',
      });
    }

    return {
      message: 'student active successfully',
    };
  }

  await AdminUsersModel.updateStudentStatus({ studentId, status });

  return {
    message: `student ${status} successfully`,
  };
};

module.exports = {
  getParents,
  getTeachers,
  updateApprovalStatus,
  updateParentStatus,
  updateStudentStatus,
};
