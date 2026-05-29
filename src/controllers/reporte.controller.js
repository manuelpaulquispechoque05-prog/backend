// Lógica CRUD de reportes. Publica eventos en Redis tras cada operación exitosa.
import {
  getReportes,
  getReporteById,
  createReporte,
  updateReporte,
  deleteReporte,
  getReportesByUbicacion
} from '../models/reporte.model.js';
import { publishEvent } from '../services/redis.service.js';
import prisma from '../config/database.js';

export const getAll = async (req, res, next) => {
  try {
    const { ubicacion } = req.query;

    let reportes;
    if (ubicacion) {
      reportes = await getReportesByUbicacion(ubicacion);
    } else {
      reportes = await getReportes();
    }

    res.status(200).json(reportes);
  } catch (error) {
    next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const reporte = await getReporteById(req.params.id);

    if (!reporte) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }

    res.status(200).json(reporte);
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const { titulo, descripcion, ubicacion } = req.body;

    if (!titulo || !ubicacion) {
      const camposFaltantes = [];
      if (!titulo) camposFaltantes.push("titulo");
      if (!ubicacion) camposFaltantes.push("ubicacion");

      return res.status(400).json({
        error: "Bad Request",
        mensaje: `Faltan los siguientes campos obligatorios: ${camposFaltantes.join(", ")}`
      });
    }

    const ADMIN_ID = "b32a0547-3ffb-41d4-91be-9820df02bbd4";

    let usuarioId = req.usuario?.id || ADMIN_ID;

    try {
      await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    } catch {
      usuarioId = null;
    }

    const nuevoReporte = await createReporte({
      titulo,
      descripcion,
      ubicacion,
      usuarioId
    });
    // Notifica a los clientes Socket.io via Redis Pub/Sub
    publishEvent('reporte.creado', nuevoReporte);
    res.status(201).json(nuevoReporte);
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const { titulo, descripcion, ubicacion, estado } = req.body;

    const reporteActualizado = await updateReporte(req.params.id, {
      titulo,
      descripcion,
      ubicacion,
      estado
    });

    if (!reporteActualizado) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }

    publishEvent('reporte.actualizado', reporteActualizado);
    res.status(200).json(reporteActualizado);
  } catch (error) {
    next(error);
  }
};

export const deleteRe = async (req, res, next) => {
  try {
    const eliminado = await deleteReporte(req.params.id);

    if (!eliminado) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }

    publishEvent('reporte.eliminado', { id: req.params.id });
    res.status(200).json({ mensaje: "Reporte eliminado correctamente" });
  } catch (error) {
    next(error);
  }
};

export const patchEstado = async (req, res, next) => {
  try {
    const { estado } = req.body;

    const estadosValidos = ['Pendiente', 'En Reparación', 'Solucionado'];

    if (!estado || !estadosValidos.includes(estado)) {
      return res.status(400).json({
        error: "Bad Request",
        mensaje: `Estado inválido. Valores permitidos: ${estadosValidos.join(", ")}`
      });
    }

    const reporteActualizado = await updateReporte(req.params.id, { estado });

    if (!reporteActualizado) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }

    publishEvent('reporte.actualizado', reporteActualizado);
    res.status(200).json(reporteActualizado);
  } catch (error) {
    next(error);
  }
};
