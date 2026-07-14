const ChatService = require('./chat.service');

const emitAck = async (socket, ack, action) => {
  try {
    const data = await action();

    if (typeof ack === 'function') {
      ack({
        success: true,
        data,
      });
    }

    return data;
  } catch (error) {
    const payload = {
      success: false,
      error: {
        message: error.message || 'Something went wrong',
        statusCode: error.statusCode || 500,
      },
    };

    if (typeof ack === 'function') {
      ack(payload);
      return null;
    }

    socket.emit('chat:error', payload.error);
    return null;
  }
};

const registerChatSocket = (io, socket) => {
  const authUser = socket.user;

  socket.join(ChatService.userRoom(authUser));

  socket.on('chat:list', async (payload = {}, ack) => {
    await emitAck(socket, ack, () =>
      ChatService.listConversations({
        authUser,
        payload,
      })
    );
  });

  socket.on('chat:contacts', async (payload = {}, ack) => {
    await emitAck(socket, ack, () =>
      ChatService.listContacts({
        authUser,
        payload,
      })
    );
  });

  socket.on('chat:conversation:create', async (payload = {}, ack) => {
    const conversation = await emitAck(socket, ack, () =>
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

  socket.on('chat:join', async (payload = {}, ack) => {
    const conversation = await emitAck(socket, ack, async () => {
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

  socket.on('chat:messages', async (payload = {}, ack) => {
    const result = await emitAck(socket, ack, () =>
      ChatService.getMessages({
        authUser,
        payload,
      })
    );

    if (result && result.conversation) {
      socket.join(ChatService.conversationRoom(result.conversation.id));
    }
  });

  socket.on('chat:message:send', async (payload = {}, ack) => {
    const result = await emitAck(socket, ack, () =>
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

  socket.on('chat:read', async (payload = {}, ack) => {
    const result = await emitAck(socket, ack, () =>
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
