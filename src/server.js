import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import reporteRoutes from './routes/reporte.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { initRedis, startSubscriber, shutdownRedis } from './services/redis.service.js';
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
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());
// Sirve la carpeta 'public/' como raíz estática (GET / → index.html).
// No choca con las rutas de API porque estas empiezan con /api/... y Express
// evalúa primero los middleware registrados antes.
app.use(express.static('public'));

const limiteSeguridad = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  skip: (req) => req.path === '/api/reportes/stream',
  message: { message: "¡Alerta de Autoataque! Demasiadas peticiones desde esta IP. Inténtalo más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiteSeguridad);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/reportes', reporteRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', mensaje: 'API StudySync funcionando' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📋 Endpoint de reportes: http://localhost:${PORT}/api/reportes`);

  startSubscriber();

  process.on('SIGINT', async () => {
    await shutdownRedis();
    process.exit(0);
  });
});