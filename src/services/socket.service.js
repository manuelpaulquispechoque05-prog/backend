import { Server } from 'socket.io';

let io;

export const initSocketIO = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`Cliente Socket.io conectado: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`Cliente Socket.io desconectado: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io no inicializado');
  }
  return io;
};
