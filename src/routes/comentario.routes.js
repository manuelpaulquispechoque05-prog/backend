// Rutas de comentarios anidadas bajo /api/reportes/:reporteId/comentarios.
// mergeParams: true permite al controlador leer req.params.reporteId.
import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { getByReporte, create, deleteCom } from '../controllers/comentario.controller.js';

const router = express.Router({ mergeParams: true });

/**
 * @openapi
 * /api/reportes/{reporteId}/comentarios:
 *   get:
 *     summary: Obtiene los comentarios de un reporte
 *     tags: [Comentarios]
 *     parameters:
 *       - in: path
 *         name: reporteId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de comentarios
 */
router.get('/', getByReporte);

/**
 * @openapi
 * /api/reportes/{reporteId}/comentarios:
 *   post:
 *     summary: Agrega un comentario a un reporte
 *     tags: [Comentarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reporteId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nota
 *             properties:
 *               nota:
 *                 type: string
 *     responses:
 *       201:
 *         description: Comentario creado
 *       401:
 *         description: No autenticado
 */
router.post('/', authenticate, create);

/**
 * @openapi
 * /api/reportes/comentarios/{id}:
 *   delete:
 *     summary: Elimina un comentario (solo ADMINISTRADOR)
 *     tags: [Comentarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Comentario eliminado
 *       403:
 *         description: No autorizado
 */
router.delete('/:id', authenticate, authorize('ADMINISTRADOR'), deleteCom);

export default router;
