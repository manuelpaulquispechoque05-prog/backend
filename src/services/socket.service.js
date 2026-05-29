// Importa la clase Server del paquete socket.io para crear el servidor WebSocket.
import { Server } from 'socket.io';

// Variable privada que almacena la instancia de Socket.io una vez inicializada.
let io;

// Recibe el httpServer nativo de Node (creado con http.createServer(app)).
export const initSocketIO = (httpServer) => {
  // Crea el servidor Socket.io montándolo sobre el mismo puerto que Express.
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Escucha cuando un cliente (Angular, HTML demo) se conecta al WebSocket.
  io.on('connection', (socket) => {
    // Muestra en la terminal del servidor el ID único del cliente conectado.
    console.log(`Cliente Socket.io conectado: ${socket.id}`);

    // Escucha cuando ese cliente se desconecta (cierra página, pierde red).
    socket.on('disconnect', () => {
      // Muestra en la terminal el ID del cliente que se fue.
      console.log(`Cliente Socket.io desconectado: ${socket.id}`);
    });
  });

  // Retorna la instancia para que server.js la use si necesita referenciarla.
  return io;
};

// Permite que otros módulos (redis.service, auth.controller) accedan a la instancia de Socket.io.
export const getIO = () => {
  // Si initSocketIO() no fue llamado antes, lanza un error claro.
  if (!io) {
    throw new Error('Socket.io no inicializado');
  }
  // Retorna la instancia de Socket.io lista para emitir eventos a todos los clientes conectados.
  return io;
};

// — Grupo Detoneitors
