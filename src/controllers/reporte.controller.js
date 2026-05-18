import {
  getReportes,
  getReporteById,
  createReporte,
  updateReporte,
  deleteReporte,
  getReportesByUbicacion
} from '../models/reporte.model.js';

/**
 * GET /api/reportes - Obtiene todos los reportes con filtro opcional por ubicación
 * Retorna: 200 OK con array de reportes
 * Autor: Paul Quispe - Programación IV
 */
export const getAll = (req, res, next) => {
  try {
    const { ubicacion } = req.query;

    let reportes;
    if (ubicacion) {
      reportes = getReportesByUbicacion(ubicacion);
    } else {
      reportes = getReportes();
    }

    res.status(200).json(reportes);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reportes/:id - Obtiene un reporte específico por su ID
 * Retorna: 200 OK si existe | 404 Not Found si no existe
 * Autor: Paul Quispe - Programación IV
 */
export const getById = (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const reporte = getReporteById(id);

    if (!reporte) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }

    res.status(200).json(reporte);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/reportes - Crea un nuevo incidente en el sistema
 * Recibe: titulo (obligatorio), descripcion, ubicacion (obligatorio)
 * Retorna: 201 Created con el nuevo reporte | 400 Bad Request si faltan campos obligatorios
 * Validación: Verifico que 'titulo' y 'ubicacion' existan en el body
 * Autor: Paul Quispe - Programación IV
 */
export const create = (req, res, next) => {
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

    const nuevoReporte = createReporte({ titulo, descripcion, ubicacion });
    res.status(201).json(nuevoReporte);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/reportes/:id - Actualiza un reporte existente (puede modificar estado, título, ubicación, descripción)
 * Retorna: 200 OK con reporte actualizado | 404 Not Found si no existe
 * Autor: Paul Quispe - Programación IV
 */
export const update = (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { titulo, descripcion, ubicacion, estado } = req.body;

    const reporteActualizado = updateReporte(id, {
      titulo,
      descripcion,
      ubicacion,
      estado
    });

    if (!reporteActualizado) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }

    res.status(200).json(reporteActualizado);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/reportes/:id - Elimina un reporte del sistema
 * Retorna: 200 OK si se eliminó | 404 Not Found si no existe
 * Autor: Paul Quispe - Programación IV
 */
export const deleteRe = (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const eliminado = deleteReporte(id);

    if (!eliminado) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }

    res.status(200).json({ mensaje: "Reporte eliminado correctamente" });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/reportes/:id/estado - Actualiza parcialmente el estado de un reporte
 * Recibe: estado (obligatorio) - valores: 'Pendiente', 'En Reparación', 'Solucionado'
 * Retorna: 200 OK con reporte actualizado | 400 Bad Request si estado inválido | 404 Not Found si no existe
 * Validación: Verifico que el estado sea uno de los valores permitidos
 * Autor: Paul Quispe - Programación IV
 */
export const patchEstado = (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { estado } = req.body;

    const estadosValidos = ['Pendiente', 'En Reparación', 'Solucionado'];

    if (!estado || !estadosValidos.includes(estado)) {
      return res.status(400).json({
        error: "Bad Request",
        mensaje: `Estado inválido. Valores permitidos: ${estadosValidos.join(", ")}`
      });
    }

    const reporteActualizado = updateReporte(id, { estado });

    if (!reporteActualizado) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }

    res.status(200).json(reporteActualizado);
  } catch (error) {
    next(error);
  }
};