const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const env = require('../config/env');
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
    const user = socket.user;

    if (env.debug) {
      console.log(
        `\x1b[34m[SOCKET]\x1b[0m \x1b[32mConnected\x1b[0m - Socket ID: ${socket.id}, User: ${user.role}:${user.id}`
      );

      // Log every incoming socket event packet
      socket.use((packet, next) => {
        const [eventName, payload] = packet;
        const safePayload = typeof payload === 'object' && payload !== null ? { ...payload } : payload;
        if (safePayload && typeof safePayload === 'object' && safePayload.password) {
          safePayload.password = '********';
        }
        console.log(
          `\x1b[34m[SOCKET]\x1b[0m \x1b[36m[EVENT]\x1b[0m ${eventName} from User(${user.role}:${user.id})`
        );
        if (safePayload !== undefined && Object.keys(safePayload || {}).length > 0) {
          console.log(`  \x1b[90mPayload:\x1b[0m`, JSON.stringify(safePayload));
        }
        next();
      });

      socket.on('disconnect', (reason) => {
        console.log(
          `\x1b[34m[SOCKET]\x1b[0m \x1b[31mDisconnected\x1b[0m - Socket ID: ${socket.id}, User: ${user.role}:${user.id}, Reason: ${reason}`
        );
      });
    }

    registerChatSocket(io, socket);
  });

  return io;
};

module.exports = initializeSocket;
