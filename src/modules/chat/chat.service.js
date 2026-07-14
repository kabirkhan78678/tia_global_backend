const ApiError = require('../../utils/apiError');
const ChatModel = require('./chat.model');
const {
  MAX_MESSAGE_LENGTH,
  VALID_RECIPIENT_ROLES,
  normalizeId,
  normalizeMessageBody,
  normalizeRole,
  parsePagination,
} = require('./chat.utils');

const isActiveUser = (user) => user && user.approval_status === 'active';
const isActiveStudent = (student) => student && student.status === 'active';

const userRoom = ({ role, id }) => `user:${role}:${id}`;
const conversationRoom = (conversationId) => `conversation:${conversationId}`;

const formatName = (entity) =>
  `${entity.first_name || ''} ${entity.last_name || ''}`.trim();

const formatUser = (entity, role) => {
  if (!entity) {
    return null;
  }

  return {
    id: entity.id,
    role,
    firstName: entity.first_name,
    lastName: entity.last_name,
    fullName: formatName(entity),
    email: entity.email,
    profileImage: entity.profile_image,
  };
};

const formatStudent = (student) => {
  if (!student) {
    return null;
  }

  return {
    id: student.id,
    role: 'student',
    firstName: student.first_name,
    lastName: student.last_name,
    fullName: formatName(student),
    email: student.email,
    gradeLevel: student.grade_level,
    academy: student.academy,
    profileImage: student.profile_image,
  };
};

const formatMessage = (message) => ({
  id: message.id,
  conversationId: message.conversation_id,
  sender: {
    role: message.sender_role,
    id: message.sender_id,
  },
  body: message.body,
  createdAt: message.created_at,
});

const getParticipantsFromConversation = async (conversation) => {
  const [parent, teacher, student] = await Promise.all([
    conversation.parent_id
      ? ChatModel.findUserByIdAndRole({ id: conversation.parent_id, role: 'parent' })
      : Promise.resolve(null),
    ChatModel.findUserByIdAndRole({ id: conversation.teacher_id, role: 'teacher' }),
    conversation.student_id
      ? ChatModel.findStudentById(conversation.student_id)
      : Promise.resolve(null),
  ]);

  return {
    parent: formatUser(parent, 'parent'),
    teacher: formatUser(teacher, 'teacher'),
    student: formatStudent(student),
  };
};

const getConversationParticipantKeys = (conversation) => {
  const participants = [
    { role: 'teacher', id: conversation.teacher_id },
  ];

  if (conversation.parent_id) {
    participants.push({ role: 'parent', id: conversation.parent_id });
  }

  if (conversation.student_id) {
    participants.push({ role: 'student', id: conversation.student_id });
  }

  return participants;
};

const formatConversation = async (conversation) => ({
  id: conversation.id,
  type: conversation.conversation_type,
  participants: await getParticipantsFromConversation(conversation),
  createdAt: conversation.created_at,
  updatedAt: conversation.updated_at,
});

const formatConversationListItem = (row, authUser) => {
  const participants = {
    parent: row.parent_id
      ? {
          id: row.parent_id,
          role: 'parent',
          firstName: row.parent_first_name,
          lastName: row.parent_last_name,
          fullName: `${row.parent_first_name || ''} ${row.parent_last_name || ''}`.trim(),
          profileImage: row.parent_profile_image,
        }
      : null,
    teacher: {
      id: row.teacher_id,
      role: 'teacher',
      firstName: row.teacher_first_name,
      lastName: row.teacher_last_name,
      fullName: `${row.teacher_first_name || ''} ${row.teacher_last_name || ''}`.trim(),
      profileImage: row.teacher_profile_image,
    },
    student: row.student_id
      ? {
          id: row.student_id,
          role: 'student',
          firstName: row.student_first_name,
          lastName: row.student_last_name,
          fullName: `${row.student_first_name || ''} ${row.student_last_name || ''}`.trim(),
          profileImage: row.student_profile_image,
          gradeLevel: row.student_grade_level,
        }
      : null,
  };

  const otherParticipant =
    authUser.role === 'teacher'
      ? participants[row.conversation_type === 'parent_teacher' ? 'parent' : 'student']
      : participants.teacher;

  return {
    id: row.id,
    type: row.conversation_type,
    participants,
    otherParticipant,
    unreadCount: Number(row.unread_count || 0),
    lastReadMessageId: row.last_read_message_id,
    lastMessage: row.last_message_id
      ? {
          id: row.last_message_id,
          body: row.last_message_body,
          sender: {
            role: row.last_message_sender_role,
            id: row.last_message_sender_id,
          },
          createdAt: row.last_message_created_at,
        }
      : null,
    updatedAt: row.updated_at,
  };
};

const formatTeacherContact = (teacher) => ({
  ...formatUser(teacher, 'teacher'),
  teachingGrade: teacher.teaching_grade,
});

const assertCurrentUserIsActive = async (authUser) => {
  if (authUser.role === 'student') {
    const student = await ChatModel.findStudentById(authUser.id);

    if (!isActiveStudent(student)) {
      throw new ApiError(403, 'Student account is not active');
    }

    return student;
  }

  const user = await ChatModel.findUserByIdAndRole({
    id: authUser.id,
    role: authUser.role,
  });

  if (!isActiveUser(user)) {
    throw new ApiError(403, 'User account is not active');
  }

  return user;
};

const assertConversationAccess = (conversation, authUser) => {
  const hasAccess =
    (authUser.role === 'parent' && Number(conversation.parent_id) === authUser.id) ||
    (authUser.role === 'teacher' && Number(conversation.teacher_id) === authUser.id) ||
    (authUser.role === 'student' && Number(conversation.student_id) === authUser.id);

  if (!hasAccess) {
    throw new ApiError(403, 'You do not have access to this conversation');
  }
};

const assertChatAllowed = async ({ authUser, recipientRole, recipientId }) => {
  if (authUser.role === recipientRole && authUser.id === recipientId) {
    throw new ApiError(400, 'You cannot create a chat with yourself');
  }

  if (authUser.role === 'parent' && recipientRole === 'teacher') {
    const teacher = await ChatModel.findUserByIdAndRole({ id: recipientId, role: 'teacher' });

    if (!isActiveUser(teacher)) {
      throw new ApiError(404, 'Teacher not found or inactive');
    }

    const allowed = await ChatModel.teacherCanChatWithParent({
      teacherId: recipientId,
      parentId: authUser.id,
    });

    if (!allowed) {
      throw new ApiError(403, 'Teacher is not assigned to any active child grade');
    }

    return {
      conversationType: 'parent_teacher',
      parentId: authUser.id,
      teacherId: recipientId,
      studentId: null,
    };
  }

  if (authUser.role === 'student' && recipientRole === 'teacher') {
    const teacher = await ChatModel.findUserByIdAndRole({ id: recipientId, role: 'teacher' });

    if (!isActiveUser(teacher)) {
      throw new ApiError(404, 'Teacher not found or inactive');
    }

    const allowed = await ChatModel.teacherCanChatWithStudent({
      teacherId: recipientId,
      studentId: authUser.id,
    });

    if (!allowed) {
      throw new ApiError(403, 'Teacher is not assigned to this student grade');
    }

    return {
      conversationType: 'student_teacher',
      parentId: null,
      teacherId: recipientId,
      studentId: authUser.id,
    };
  }

  if (authUser.role === 'teacher' && recipientRole === 'student') {
    const student = await ChatModel.findStudentById(recipientId);

    if (!isActiveStudent(student)) {
      throw new ApiError(404, 'Student not found or inactive');
    }

    const allowed = await ChatModel.teacherCanChatWithStudent({
      teacherId: authUser.id,
      studentId: recipientId,
    });

    if (!allowed) {
      throw new ApiError(403, 'You are not assigned to this student grade');
    }

    return {
      conversationType: 'student_teacher',
      parentId: null,
      teacherId: authUser.id,
      studentId: recipientId,
    };
  }

  if (authUser.role === 'teacher' && recipientRole === 'parent') {
    const parent = await ChatModel.findUserByIdAndRole({ id: recipientId, role: 'parent' });

    if (!isActiveUser(parent)) {
      throw new ApiError(404, 'Parent not found or inactive');
    }

    const allowed = await ChatModel.teacherCanChatWithParent({
      teacherId: authUser.id,
      parentId: recipientId,
    });

    if (!allowed) {
      throw new ApiError(403, 'You are not assigned to this parent child grade');
    }

    return {
      conversationType: 'parent_teacher',
      parentId: recipientId,
      teacherId: authUser.id,
      studentId: null,
    };
  }

  throw new ApiError(400, 'Allowed chats are parent-teacher and student-teacher only');
};

const getOrCreateConversation = async ({ authUser, recipientRole, recipientId }) => {
  const normalizedRecipientRole = normalizeRole(recipientRole);
  const normalizedRecipientId = normalizeId(recipientId);

  if (!VALID_RECIPIENT_ROLES.includes(normalizedRecipientRole) || !normalizedRecipientId) {
    throw new ApiError(400, 'Valid recipientRole and recipientId are required');
  }

  await assertCurrentUserIsActive(authUser);

  const allowed = await assertChatAllowed({
    authUser,
    recipientRole: normalizedRecipientRole,
    recipientId: normalizedRecipientId,
  });

  const existing = await ChatModel.findConversationByParticipants(allowed);

  if (existing) {
    return formatConversation(existing);
  }

  const conversationId = await ChatModel.createConversation({
    ...allowed,
    createdByRole: authUser.role,
    createdById: authUser.id,
  });

  const conversation = await ChatModel.findConversationById(conversationId);

  return formatConversation(conversation);
};

const getConversationForUser = async ({ authUser, conversationId }) => {
  const normalizedConversationId = normalizeId(conversationId);

  if (!normalizedConversationId) {
    throw new ApiError(400, 'Valid conversationId is required');
  }

  const conversation = await ChatModel.findConversationById(normalizedConversationId);

  if (!conversation) {
    throw new ApiError(404, 'Conversation not found');
  }

  assertConversationAccess(conversation, authUser);

  return conversation;
};

const listConversations = async ({ authUser, payload = {} }) => {
  await assertCurrentUserIsActive(authUser);

  const { limit, page } = parsePagination(payload);
  const offset = (page - 1) * limit;
  const rows = await ChatModel.findConversationList({ authUser, limit, offset });

  return {
    conversations: rows.map((row) => formatConversationListItem(row, authUser)),
    pagination: {
      page,
      limit,
      hasMore: rows.length === limit,
    },
  };
};

const listContacts = async ({ authUser }) => {
  await assertCurrentUserIsActive(authUser);

  if (authUser.role === 'parent') {
    const teachers = await ChatModel.findEligibleTeachersForParent(authUser.id);

    return {
      teachers: teachers.map(formatTeacherContact),
    };
  }

  if (authUser.role === 'student') {
    const teachers = await ChatModel.findEligibleTeachersForStudent(authUser.id);

    return {
      teachers: teachers.map(formatTeacherContact),
    };
  }

  const [parents, students] = await Promise.all([
    ChatModel.findEligibleParentsForTeacher(authUser.id),
    ChatModel.findEligibleStudentsForTeacher(authUser.id),
  ]);

  return {
    parents: parents.map((parent) => formatUser(parent, 'parent')),
    students: students.map(formatStudent),
  };
};

const getMessages = async ({ authUser, payload = {} }) => {
  await assertCurrentUserIsActive(authUser);

  const conversation = await getConversationForUser({
    authUser,
    conversationId: payload.conversationId,
  });
  const { limit, beforeMessageId } = parsePagination(payload);
  const messages = await ChatModel.findMessagesByConversationId({
    conversationId: conversation.id,
    beforeMessageId,
    limit,
  });

  return {
    conversation: await formatConversation(conversation),
    messages: messages.map(formatMessage),
    pagination: {
      limit,
      beforeMessageId,
      hasMore: messages.length === limit,
    },
  };
};

const sendMessage = async ({ authUser, payload = {} }) => {
  await assertCurrentUserIsActive(authUser);

  const body = normalizeMessageBody(payload.body);

  if (!body) {
    throw new ApiError(400, 'Message body is required');
  }

  if (body.length > MAX_MESSAGE_LENGTH) {
    throw new ApiError(400, `Message body cannot exceed ${MAX_MESSAGE_LENGTH} characters`);
  }

  let conversation;

  if (payload.conversationId) {
    conversation = await getConversationForUser({
      authUser,
      conversationId: payload.conversationId,
    });
  } else {
    const createdConversation = await getOrCreateConversation({
      authUser,
      recipientRole: payload.recipientRole,
      recipientId: payload.recipientId,
    });

    conversation = await ChatModel.findConversationById(createdConversation.id);
  }

  const messageId = await ChatModel.createMessage({
    conversationId: conversation.id,
    senderRole: authUser.role,
    senderId: authUser.id,
    body,
  });

  await ChatModel.touchConversation(conversation.id);
  await ChatModel.upsertReadCursor({
    conversationId: conversation.id,
    participantRole: authUser.role,
    participantId: authUser.id,
    messageId,
  });

  const message = await ChatModel.findMessageById(messageId);

  return {
    conversation: await formatConversation(conversation),
    message: formatMessage(message),
    roomNames: {
      conversation: conversationRoom(conversation.id),
      participants: getConversationParticipantKeys(conversation).map(userRoom),
    },
  };
};

const markRead = async ({ authUser, payload = {} }) => {
  await assertCurrentUserIsActive(authUser);

  const conversation = await getConversationForUser({
    authUser,
    conversationId: payload.conversationId,
  });
  let messageId = normalizeId(payload.messageId);

  if (messageId) {
    const message = await ChatModel.findMessageById(messageId);

    if (!message || Number(message.conversation_id) !== Number(conversation.id)) {
      throw new ApiError(404, 'Message not found in this conversation');
    }
  } else {
    const latestMessage = await ChatModel.findLatestMessageByConversationId(conversation.id);
    messageId = latestMessage ? latestMessage.id : null;
  }

  await ChatModel.upsertReadCursor({
    conversationId: conversation.id,
    participantRole: authUser.role,
    participantId: authUser.id,
    messageId,
  });

  return {
    conversationId: conversation.id,
    messageId,
    reader: {
      role: authUser.role,
      id: authUser.id,
    },
  };
};

module.exports = {
  conversationRoom,
  getConversationForUser,
  getConversationParticipantKeys,
  listContacts,
  getMessages,
  getOrCreateConversation,
  listConversations,
  markRead,
  sendMessage,
  userRoom,
};
