const ApiError = require('../../../utils/apiError');
const AdminUsersModel = require('./admin.users.model');

const ALLOWED_ROLES = ['parent', 'teacher'];
const ALLOWED_APPROVAL_STATUSES = ['pending', 'approved', 'rejected'];

const formatTeacher = (teacher) => ({
  id: teacher.id,
  role: teacher.role,
  firstName: teacher.first_name,
  lastName: teacher.last_name,
  fullName: `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim(),
  phone: teacher.phone,
  email: teacher.email,
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
  username: student.username,
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

  return {
    message: `${role} ${status} successfully`,
  };
};

module.exports = {
  getParents,
  getTeachers,
  updateApprovalStatus,
};
