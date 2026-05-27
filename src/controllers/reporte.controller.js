// ============================================================
// reporte.controller.js — Lógica de negocio de los reportes
// ============================================================
// ¿Qué es? El controlador que maneja las peticiones HTTP para CRUD
//   de reportes de infraestructura universitaria.
// ¿Para qué sirve? Cada función aquí recibe un req/res de Express,
//   valida los datos, llama al modelo (reporte.model.js) y devuelve
//   la respuesta JSON. Además, después de cada operación exitosa,
//   publica un evento en Redis via publishEvent().
// ¿Cómo funciona?
//   1. Express enruta la petición a la función correspondiente
//   2. La función valida, opera sobre el modelo y responde
//   3. DESPUÉS de modificar datos, llama a publishEvent()
//   4. publishEvent() envía el mensaje a Redis → subscriber → SSE
// ¿Cómo se conecta?
//   - Las funciones son llamadas desde reporte.routes.js
//   - publishEvent() viene de redis.service.js
//   - Los datos los obtiene de reporte.model.js
// diseñé este controlador para
// que cada CRUD dispare un evento de Redis sin acoplar la lógica
// de negocio con la de tiempo real.
// ============================================================

import {
  getReportes,
  getReporteById,
  createReporte,
  updateReporte,
  deleteReporte,
  getReportesByUbicacion
} from '../models/reporte.model.js';
// publishEvent() viene de redis.service.js.
// Cada handler CRUD publica un mensaje en el canal 'reportes:eventos' de Redis.
import { publishEvent } from '../services/redis.service.js';

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

    const nuevoReporte = await createReporte({ titulo, descripcion, ubicacion });
    // Publico evento en Redis: el subscriber lo recibe y broadcast() lo envía a los clientes SSE
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
