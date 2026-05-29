// Yo, Paul Quispe — Servidor Socket.io montado sobre el mismo httpServer
// de Express. initSocketIO() crea la instancia, getIO() la expone para que
// redis.service.js y auth.controller.js emitan eventos a los clientes.
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
