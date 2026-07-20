const ChatService = require('./chat.service');

console.log('[CHAT_SOCKET_LOAD] ChatService keys at module load:', Object.keys(ChatService || {}));

const emitResponse = async (socket, responseEvent, action) => {
  try {
    const data = await action();

    socket.emit(responseEvent, {
      success: true,
      data,
    });

    return data;
  } catch (error) {
    const payload = {
      success: false,
      error: {
        message: error.message || 'Something went wrong',
        statusCode: error.statusCode || 500,
      },
    };

    socket.emit(responseEvent, payload);
    socket.emit('chat:error', payload.error);
    return null;
  }
};

const registerChatSocket = (io, socket) => {
  const authUser = socket.user;

  console.log('[CHAT_SOCKET_CONN] ChatService keys at connection:', Object.keys(ChatService || {}));
  console.log('[CHAT_SOCKET_CONN] userRoom type:', typeof ChatService.userRoom);

  socket.join(ChatService.userRoom(authUser));

  socket.on('chat:list', async (payload) => {
    const safePayload = payload || {};
    await emitResponse(socket, 'chat:list:response', () =>
      ChatService.listConversations({
        authUser,
        payload: safePayload,
      })
    );
  });

  socket.on('chat:contacts', async (payload) => {
    const safePayload = payload || {};
    await emitResponse(socket, 'chat:contacts:response', () =>
      ChatService.listContacts({
        authUser,
        payload: safePayload,
      })
    );
  });

  socket.on('chat:conversation:create', async (payload) => {
    const safePayload = payload || {};
    const conversation = await emitResponse(socket, 'chat:conversation:create:response', () =>
      ChatService.getOrCreateConversation({
        authUser,
        recipientRole: safePayload.recipientRole,
        recipientId: safePayload.recipientId,
      })
    );

    if (!conversation) {
      return;
    }

    socket.join(ChatService.conversationRoom(conversation.id));
  });

  socket.on('chat:join', async (payload) => {
    const safePayload = payload || {};
    const conversation = await emitResponse(socket, 'chat:join:response', async () => {
      const row = await ChatService.getConversationForUser({
        authUser,
        conversationId: safePayload.conversationId,
      });

      return {
        conversationId: row.id,
      };
    });

    if (!conversation) {
      return;
    }

    socket.join(ChatService.conversationRoom(conversation.conversationId));
  });

  socket.on('chat:messages', async (payload) => {
    const safePayload = payload || {};
    const result = await emitResponse(socket, 'chat:messages:response', () =>
      ChatService.getMessages({
        authUser,
        payload: safePayload,
      })
    );

    if (result && result.conversation) {
      socket.join(ChatService.conversationRoom(result.conversation.id));
    }
  });

  socket.on('chat:message:send', async (payload) => {
    const safePayload = payload || {};
    const result = await emitResponse(socket, 'chat:message:send:response', () =>
      ChatService.sendMessage({
        authUser,
        payload: safePayload,
      })
    );

    if (!result) {
      return;
    }

    socket.join(result.roomNames.conversation);
    io.to(result.roomNames.conversation).emit('chat:message:new', {
      conversation: result.conversation,
      message: result.message,
    });

    for (const room of result.roomNames.participants) {
      io.to(room).emit('chat:list:update', {
        conversationId: result.conversation.id,
      });
    }
  });

  socket.on('chat:read', async (payload) => {
    const safePayload = payload || {};
    const result = await emitResponse(socket, 'chat:read:response', () =>
      ChatService.markRead({
        authUser,
        payload: safePayload,
      })
    );

    if (!result) {
      return;
    }

    io.to(ChatService.conversationRoom(result.conversationId)).emit('chat:read:update', result);
    io.to(ChatService.userRoom(authUser)).emit('chat:list:update', {
      conversationId: result.conversationId,
    });
  });
};

module.exports = registerChatSocket;
