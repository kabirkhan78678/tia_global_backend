const ChatService = require('./chat.service');

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

  socket.join(ChatService.userRoom(authUser));

  socket.on('chat:list', async (payload = {}) => {
    await emitResponse(socket, 'chat:list:response', () =>
      ChatService.listConversations({
        authUser,
        payload,
      })
    );
  });

  socket.on('chat:contacts', async (payload = {}) => {
    await emitResponse(socket, 'chat:contacts:response', () =>
      ChatService.listContacts({
        authUser,
        payload,
      })

    );
    console.log(payload, "chat:contacts")
  });

  // console.log(payload, "chat:contacts")

  socket.on('chat:conversation:create', async (payload = {}) => {
    const conversation = await emitResponse(socket, 'chat:conversation:create:response', () =>
      ChatService.getOrCreateConversation({
        authUser,
        recipientRole: payload.recipientRole,
        recipientId: payload.recipientId,
      })
    );

    if (!conversation) {
      return;
    }

    socket.join(ChatService.conversationRoom(conversation.id));
  });

  socket.on('chat:join', async (payload = {}) => {
    const conversation = await emitResponse(socket, 'chat:join:response', async () => {
      const row = await ChatService.getConversationForUser({
        authUser,
        conversationId: payload.conversationId,
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

  socket.on('chat:messages', async (payload = {}) => {
    const result = await emitResponse(socket, 'chat:messages:response', () =>
      ChatService.getMessages({
        authUser,
        payload,
      })
    );

    if (result && result.conversation) {
      socket.join(ChatService.conversationRoom(result.conversation.id));
    }
  });

  socket.on('chat:message:send', async (payload = {}) => {
    const result = await emitResponse(socket, 'chat:message:send:response', () =>
      ChatService.sendMessage({
        authUser,
        payload,
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

  socket.on('chat:read', async (payload = {}) => {
    const result = await emitResponse(socket, 'chat:read:response', () =>
      ChatService.markRead({
        authUser,
        payload,
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
