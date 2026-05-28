// ============================================================
// server.js — Punto de entrada de la API StudySync
// ============================================================
// ¿Qué es? El archivo principal que arranca el servidor Express.
// ¿Para qué sirve? Configura todos los middleware globales (cors,
//   json, rate limit, estáticos), monta las rutas de la API y
//   arranca Redis Pub/Sub para tiempo real.
// ¿Cómo funciona? El orden de los middleware es CRÍTICO:
//   1. cors → permite peticiones desde Angular (otro puerto/origen)
//   2. express.json() → parsea el body de las peticiones
//   3. express.static('public') → sirve index.html al docente
//   4. limiteSeguridad (rate limiter) → protege rutas API
//   5. /api-docs (Swagger UI) → documentación interactiva
//   6. /api/reportes (routes) → endpoints CRUD
//   7. /health → health check
//   8. errorHandler → captura errores globales
// ¿Cómo se conecta?
//   - initRedis() → crea publisher + subscriber (redis.service.js)
//   - startSubscriber() → arranca listener de Redis (redis.service.js)
//   - shutdownRedis() → cierra conexiones en SIGINT
//   - reporteRoutes → importa routes/reporte.routes.js
//   - swaggerSpec → importa swagger/config.js
//  estructuré este orden para que
// los archivos estáticos no se vean afectados por el rate
// limiter, y para que la documentación de Swagger sea accesible.
// ============================================================

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
// initRedis() crea las conexiones (publisher + subscriber) a Upstash Redis.
// startSubscriber() arranca el listener de eventos del canal 'reportes:eventos'.
// shutdownRedis() cierra ambas conexiones de forma graceful al detener el server.
import { initRedis, startSubscriber, shutdownRedis } from './services/redis.service.js';
// initSocketIO() crea el servidor Socket.io sobre el httpServer.
import { initSocketIO } from './services/socket.service.js';
// swaggerSpec contiene la configuración OpenAPI 3.0 escaneando los
// comentarios /** @openapi */ en los archivos de rutas.
import { swaggerSpec } from './swagger/config.js';

dotenv.config();
initRedis();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS: permitimos cualquier origen porque Angular corre en un puerto distinto.
// '*' es suficiente para desarrollo; en producción se puede restringir al dominio de Vercel.
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Sirve la carpeta 'public/' como raíz estática (GET / → index.html).
// Va ANTES del rate limiter para que el docente pueda cargar la página
// demo sin restricción de 10 peticiones/minuto.
app.use(express.static('public'));

// Rate limiter: máximo 10 peticiones por IP cada 1 minuto.
// Protege los endpoints de API contra abusos (autoataques).
const limiteSeguridad = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: "¡Alerta de Autoataque! Demasiadas peticiones desde esta IP. Inténtalo más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiteSeguridad);

// Swagger UI: documentación interactiva en /api-docs.
// Escanea los comentarios /** @openapi */ de las rutas y genera
// la interfaz visual donde el docente puede probar los endpoints.
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Monta las rutas de reportes
app.use('/api/reportes', reporteRoutes);
app.use('/api/reportes/:reporteId/comentarios', comentarioRoutes);
app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', mensaje: 'API StudySync funcionando' });
});

app.use(errorHandler);

// Crea un servidor HTTP nativo para que tanto Express como Socket.io
// compartan el mismo puerto.
const httpServer = http.createServer(app);
// Inicializa Socket.io sobre el httpServer
initSocketIO(httpServer);

httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📋 Endpoint de reportes: http://localhost:${PORT}/api/reportes`);

  // Arranca el subscriber de Redis DESPUÉS de que el servidor
  // esté escuchando. Así si Redis falla, la API REST sigue funcionando.
  startSubscriber();

  // Captura SIGINT (Ctrl+C) para cerrar Redis de forma graceful
  // y no dejar conexiones colgadas en Upstash.
  process.on('SIGINT', async () => {
    await shutdownRedis();
    process.exit(0);
  });
});
