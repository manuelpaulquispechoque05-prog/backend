import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import reporteRoutes from './routes/reporte.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

app.use('/api/reportes', reporteRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', mensaje: 'API StudySync funcionando' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📋 Endpoint de reportes: http://localhost:${PORT}/api/reportes`);
});