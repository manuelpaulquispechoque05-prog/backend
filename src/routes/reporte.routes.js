import express from 'express';
import {
  getAll,
  getById,
  create,
  update,
  deleteRe,
  patchEstado
} from '../controllers/reporte.controller.js';
import { addClient } from '../services/sse-manager.service.js';

const router = express.Router();

/**
 * @openapi
 * /api/reportes:
 *   get:
 *     summary: Obtiene todos los reportes
 *     tags: [Reportes]
 *     parameters:
 *       - in: query
 *         name: ubicacion
 *         schema:
 *           type: string
 *         description: Filtrar reportes por ubicación
 *     responses:
 *       200:
 *         description: Lista de reportes obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   titulo:
 *                     type: string
 *                   descripcion:
 *                     type: string
 *                   ubicacion:
 *                     type: string
 *                   estado:
 *                     type: string
 *                     enum: [Pendiente, En Reparación, Solucionado]
 *                   fechaCreacion:
 *                     type: string
 *                     format: date-time
 */
router.get('/', getAll);
/**
 * @openapi
 * /api/reportes/stream:
 *   get:
 *     summary: Stream SSE de eventos en tiempo real (Redis Pub/Sub)
 *     tags: [Reportes, Tiempo Real]
 *     responses:
 *       200:
 *         description: Conexión SSE establecida correctamente
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
// Endpoint SSE (Server-Sent Events) — transmite eventos de Redis en tiempo real
// DEBE ir ANTES de /:id para que Express no interprete "stream" como un parámetro dinámico
router.get('/stream', (req, res) => {
  // Headers obligatorios del protocolo SSE:
  // - text/event-stream: indica al navegador que es un stream, no HTML/JSON. Sin esto EventSource no funciona
  // - no-cache: evita que proxies (Render, Cloudflare) cacheen el stream y entreguen datos obsoletos
  // - keep-alive: mantiene el socket TCP abierto para seguir recibiendo mensajes sin reconectar
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Registra este cliente (response) en el Set del sse-manager
  addClient(res);

  // Heartbeat cada 30 segundos: Render y Railway cierran conexiones inactivas tras ~30s.
  // El prefijo ":" indica un comentario SSE que el navegador ignora pero mantiene viva la conexión.
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 30000);

  // Cuando el usuario cierra la pestaña o recarga la página:
  // 1. Express emite 'close' en el objeto req
  // 2. Limpiamos el intervalo para evitar escribir sobre una conexión muerta
  // 3. addClient() ya registró clients.delete(res) en este mismo evento
  req.on('close', () => {
    clearInterval(heartbeat);
  });
});
router.get('/:id', getById);
router.post('/', create);
router.put('/:id', update);
router.patch('/:id', patchEstado);
router.delete('/:id', deleteRe);

export default router;