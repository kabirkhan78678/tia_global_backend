const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const registerChatSocket = require('../modules/chat/chat.socket');

const extractBearerToken = (socket) => {
  const authToken = socket.handshake.auth && socket.handshake.auth.token;

  if (authToken) {
    return String(authToken).replace(/^Bearer\s+/i, '').trim();
  }

  const header = socket.handshake.headers.authorization;

  if (header && String(header).startsWith('Bearer ')) {
    return String(header).split(' ')[1];
  }

  return null;
};

const authenticateSocket = (socket, next) => {
  try {
    const token = extractBearerToken(socket);

    if (!token) {
      return next(new Error('Authorization token is required'));
    }

    socket.user = jwt.verify(token, process.env.JWT_SECRET);

    if (!socket.user || !socket.user.id || !socket.user.role) {
      return next(new Error('Invalid token payload'));
    }

    return next();
  } catch (error) {
    return next(new Error('Invalid or expired token'));
  }
};

const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    registerChatSocket(io, socket);
  });

  return io;
};

module.exports = initializeSocket;
