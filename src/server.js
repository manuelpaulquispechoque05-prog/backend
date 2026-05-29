// Entry point. Configura middlewares, monta rutas y arranca Redis + Socket.io.
import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import reporteRoutes from './routes/reporte.routes.js';
import authRoutes from './routes/auth.routes.js';
import comentarioRoutes from './routes/comentario.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { initRedis, startSubscriber, shutdownRedis } from './services/redis.service.js';
import { initSocketIO } from './services/socket.service.js';
import { swaggerSpec } from './swagger/config.js';

dotenv.config();
initRedis();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS abierto para desarrollo.
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Sirve public/ antes del rate limiter para que la demo sea accesible.
app.use(express.static('public'));

// 10 peticiones/minuto por IP.
const limiteSeguridad = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: "¡Alerta de Autoataque! Demasiadas peticiones desde esta IP. Inténtalo más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiteSeguridad);

// Documentación interactiva en /api-docs.
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Monta las rutas de reportes
app.use('/api/reportes', reporteRoutes);
app.use('/api/reportes/:reporteId/comentarios', comentarioRoutes);
app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', mensaje: 'API StudySync funcionando' });
});

app.use(errorHandler);

// Socket.io sobre el mismo puerto que Express.
const httpServer = http.createServer(app);
// Inicializa Socket.io sobre el httpServer
initSocketIO(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📋 Endpoint de reportes: http://localhost:${PORT}/api/reportes`);

  // Redis subscriber arranca después del listen para no bloquear.
  startSubscriber();

  // Cierre graceful de Redis al detener el servidor.
  process.on('SIGINT', async () => {
    await shutdownRedis();
    process.exit(0);
  });
});

// — Grupo Detoneitors
