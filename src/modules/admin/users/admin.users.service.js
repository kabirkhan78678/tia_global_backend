const bcrypt = require('bcrypt');
const crypto = require('crypto');

const ApiError = require('../../../utils/apiError');
const AdminUsersModel = require('./admin.users.model');
const InvoiceService = require('../../../services/invoice.service');
const { sendStudentApprovedEmail } = require('../../../services/email.service');
const NotificationService = require('../../notifications/notification.service');

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

  // Send push & in-app notification to the approved/updated user
  try {
    NotificationService.notifyUser({
      recipientId: userId,
      recipientRole: role,
      title: status === 'active' ? 'Account Approved! 🎉' : `Account Status: ${status.toUpperCase()}`,
      body: status === 'active'
        ? `Your ${role} account has been approved by the Admin. You can now access all portal features!`
        : `Your ${role} account status has been updated to ${status}.`,
      type: 'approval',
      dataPayload: {
        userId: String(userId),
        role: String(role),
        status: String(status),
      },
    }).catch((err) => console.error('[USER_APPROVAL_NOTIF_ERR]:', err.message));
  } catch (err) {
    console.error('[APPROVAL_NOTIF_ERR]:', err.message);
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

  // Send push & in-app notification to parent
  try {
    NotificationService.notifyUser({
      recipientId: parentId,
      recipientRole: 'parent',
      title: status === 'active' ? 'Parent Account Approved! 🎉' : `Account Status: ${status.toUpperCase()}`,
      body: status === 'active'
        ? 'Your parent account has been approved by the Admin. Welcome to Tia Global!'
        : `Your parent account status has been updated to ${status}.`,
      type: 'approval',
      dataPayload: {
        parentId: String(parentId),
        status: String(status),
      },
    }).catch((err) => console.error('[PARENT_APPROVAL_NOTIF_ERR]:', err.message));
  } catch (err) {
    console.error('[PARENT_NOTIF_ERR]:', err.message);
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

    // Send push & in-app notification to student
    try {
      NotificationService.notifyUser({
        recipientId: studentId,
        recipientRole: 'student',
        title: 'Student Account Activated! 🎉',
        body: `Welcome ${student.first_name}! Your student account is now active. Check your email for login credentials.`,
        type: 'approval',
        dataPayload: {
          studentId: String(studentId),
          status: 'active',
        },
      }).catch((err) => console.error('[STUDENT_APPROVAL_NOTIF_ERR]:', err.message));
    } catch (err) {
      console.error('[STUDENT_NOTIF_ERR]:', err.message);
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

const getAdminDashboard = async (adminUser = {}) => {
  const stats = await AdminUsersModel.getAdminDashboardStats();
  const rawApplications = await AdminUsersModel.getRecentApplications(10);

  const formattedApplications = [];

  for (let i = 0; i < rawApplications.length; i++) {
    const app = rawApplications[i];
    const students = await AdminUsersModel.findStudentsByParentId(app.parent_id);

    const formattedStudents = students.map((s) => ({
      id: s.id,
      name: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
      firstName: s.first_name,
      lastName: s.last_name,
      dob: s.dob,
      gradeLevel: s.grade_level,
      academy: s.academy,
      email: s.email,
      status: s.status,
      profileImage: s.profile_image,
    }));

    const dateObj = new Date(app.created_at);
    const formattedDate = !isNaN(dateObj)
      ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;

    formattedApplications.push({
      s_no: i + 1,
      parent_id: app.parent_id,
      parent_name: `${app.parent_first_name || ''} ${app.parent_last_name || ''}`.trim(),
      email: app.email,
      phone: app.phone,
      profile_image: app.parent_profile_image,
      total_child: parseInt(app.total_child || formattedStudents.length, 10),
      status: (app.status || 'pending').toUpperCase(),
      raw_status: app.status || 'pending',
      date: app.created_at,
      formatted_date: formattedDate,
      students: formattedStudents,
    });
  }

  return {
    admin_info: {
      name: adminUser?.name || 'Tia Global',
      email: adminUser?.email || '',
      role: 'admin',
    },
    stats: {
      total_students: stats.total_students,
      total_teachers: stats.total_teachers,
      upcoming_events: stats.upcoming_events,
      announcements: stats.announcements,
    },
    recent_applications: formattedApplications,
  };
};

module.exports = {
  getParents,
  getTeachers,
  updateApprovalStatus,
  updateParentStatus,
  updateStudentStatus,
  getAdminDashboard,
};
