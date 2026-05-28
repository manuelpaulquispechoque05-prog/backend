// ============================================================
// reporte.routes.js — Definición de rutas de la API de reportes
// ============================================================
// ¿Qué es? El enrutador de Express que mapea cada URL a su controlador.
// ¿Para qué sirve? Define los endpoints REST para reportes.
// ¿Cómo funciona? Cada router.get/post/put/patch/delete enlaza una
//   URL con una función del controlador.
// ¿Cómo se conecta?
//   - Los controladores (getAll, create, etc.) vienen de reporte.controller.js
//   - Este router se exporta y se monta en server.js como /api/reportes
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
import { authenticate, authorize } from '../middlewares/auth.js';

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
 *                     type: string
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
 *           type: string
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
router.put('/:id', authenticate, authorize('ADMINISTRADOR'), update);
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
 *           type: string
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
router.patch('/:id', authenticate, authorize('ADMINISTRADOR'), patchEstado);
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
 *           type: string
 *         description: ID del reporte
 *     responses:
 *       200:
 *         description: Reporte eliminado correctamente
 *       404:
 *         description: Reporte no encontrado
 */
router.delete('/:id', authenticate, authorize('ADMINISTRADOR'), deleteRe);

export default router;
