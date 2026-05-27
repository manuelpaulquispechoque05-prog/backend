// ============================================================
// reporte.routes.js — Definición de rutas de la API de reportes
// ============================================================
// ¿Qué es? El enrutador de Express que mapea cada URL a su controlador.
// ¿Para qué sirve? Define los endpoints REST para reportes más el
//   endpoint SSE /stream para tiempo real.
// ¿Cómo funciona? Cada router.get/post/put/patch/delete enlaza una
//   URL con una función del controlador o con un handler inline (SSE).
// ¿Cómo se conecta?
//   - Los controladores (getAll, create, etc.) vienen de reporte.controller.js
//   - addClient() viene de sse-manager.service.js (para el stream SSE)
//   - Este router se exporta y se monta en server.js como /api/reportes
// Yo, Paul Quispe - Programación IV, definí el orden de las rutas
// para que /stream se evalúe ANTES que /:id y Express no confunda
// "stream" con un ID dinámico.
// ============================================================

import express from 'express';
import {
  getAll,
  getById,
  create,
  update,
  deleteRe,
  patchEstado
} from '../controllers/reporte.controller.js';
// addClient registra la response HTTP en el Set del sse-manager
// para que broadcast() pueda escribirle eventos en tiempo real
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
// Endpoint SSE — transmite eventos de Redis en tiempo real.
// DEBE ir ANTES de /:id para que Express no interprete "stream"
// como un parámetro dinámico. Importa addClient() del sse-manager
// para registrar esta conexión y recibir eventos via broadcast().
router.get('/stream', (req, res) => {
  // Headers obligatorios del protocolo SSE:
  // - text/event-stream: indica al navegador que es un stream, no HTML/JSON.
  //   Sin esto, new EventSource(url) no se conecta.
  // - no-cache: evita que proxies (Render, Cloudflare) cacheen el stream
  //   y entreguen datos obsoletos al cliente.
  // - keep-alive: mantiene el socket TCP abierto para seguir recibiendo
  //   mensajes sin tener que reconectar en cada evento.
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Registro esta response (res) en el Set del sse-manager.
  // Ahora broadcast() podrá escribirle los eventos que lleguen de Redis.
  addClient(res);

  // Heartbeat cada 30 segundos: Render y otros hosting cierran conexiones
  // inactivas tras ~30 segundos. El prefijo ":" indica un comentario SSE
  // que el navegador ignora pero mantiene la conexión "viva" ante el proxy.
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 30000);

  // Cuando el usuario cierra la pestaña o recarga la página:
  // 1. Express emite el evento 'close' en el objeto req
  // 2. Limpiamos el intervalo para no hacer res.write() sobre socket muerto
  // 3. addClient() ya registró clients.delete(res) en este mismo evento,
  //    así que no necesito hacerlo manualmente aquí.
  req.on('close', () => {
    clearInterval(heartbeat);
  });
});
router.get('/:id', getById);
/**
 * @openapi
 * /api/reportes:
 *   post:
 *     summary: Crea un nuevo reporte
 *     tags: [Reportes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - titulo
 *               - ubicacion
 *             properties:
 *               titulo:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               ubicacion:
 *                 type: string
 *     responses:
 *       201:
 *         description: Reporte creado exitosamente
 *       400:
 *         description: Faltan campos obligatorios
 */
router.post('/', create);
/**
 * @openapi
 * /api/reportes/{id}:
 *   put:
 *     summary: Actualiza un reporte existente
 *     tags: [Reportes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del reporte
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               titulo:
 *                 type: string
 *               descripcion:
 *                 type: string
 *               ubicacion:
 *                 type: string
 *               estado:
 *                 type: string
 *                 enum: [Pendiente, En Reparación, Solucionado]
 *     responses:
 *       200:
 *         description: Reporte actualizado correctamente
 *       404:
 *         description: Reporte no encontrado
 */
router.put('/:id', update);
/**
 * @openapi
 * /api/reportes/{id}:
 *   patch:
 *     summary: Actualiza parcialmente el estado de un reporte
 *     tags: [Reportes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del reporte
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - estado
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [Pendiente, En Reparación, Solucionado]
 *     responses:
 *       200:
 *         description: Estado actualizado correctamente
 *       400:
 *         description: Estado inválido
 *       404:
 *         description: Reporte no encontrado
 */
router.patch('/:id', patchEstado);
/**
 * @openapi
 * /api/reportes/{id}:
 *   delete:
 *     summary: Elimina un reporte
 *     tags: [Reportes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del reporte
 *     responses:
 *       200:
 *         description: Reporte eliminado correctamente
 *       404:
 *         description: Reporte no encontrado
 */
router.delete('/:id', deleteRe);

export default router;
