// Importa las funciones de acceso a datos para reportes desde el modelo.
import {
  getReportes,
  getReporteById,
  createReporte,
  updateReporte,
  deleteReporte,
  getReportesByUbicacion
} from '../models/reporte.model.js';
// Importa publishEvent para notificar a Redis cuando se crea/actualiza/elimina un reporte.
import { publishEvent, getCache, setCache, delCache, clearAllCache } from '../services/redis.service.js';
// Obtiene todos los reportes con cache-aside (Redis + 30s TTL).
export const getAll = async (req, res, next) => {
  try {
    // Cache-aside: intentar Redis primero
    const cached = await getCache('reportes:all');
    if (cached) return res.status(200).json(cached);

    const { ubicacion } = req.query;
    let reportes;
    if (ubicacion) {
      reportes = await getReportesByUbicacion(ubicacion);
    } else {
      reportes = await getReportes();
    }

    // Guardar en caché por 30 segundos
    setCache('reportes:all', reportes, 30);
    res.status(200).json(reportes);
  } catch (error) {
    next(error);
  }
};

// Obtiene un reporte específico por su ID (tomado de req.params.id).
export const getById = async (req, res, next) => {
  try {
    // Busca el reporte en Supabase usando el ID de la URL.
    const reporte = await getReporteById(req.params.id);

    // Si el reporte no existe, devuelve 404.
    if (!reporte) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }

    // Devuelve el reporte encontrado en formato JSON.
    res.status(200).json(reporte);
  } catch (error) {
    next(error);
  }
};

// Crea un nuevo reporte. Recibe titulo, descripcion y ubicacion del body.
export const create = async (req, res, next) => {
  try {
    // Extrae los campos del cuerpo de la petición HTTP.
    const { titulo, descripcion, ubicacion } = req.body;

    // Valida que título y ubicación sean obligatorios.
    if (!titulo || !ubicacion) {
      const camposFaltantes = [];
      if (!titulo) camposFaltantes.push("titulo");
      if (!ubicacion) camposFaltantes.push("ubicacion");

      return res.status(400).json({
        error: "Bad Request",
        mensaje: `Faltan los siguientes campos obligatorios: ${camposFaltantes.join(", ")}`
      });
    }

    // Crea el reporte con el usuario autenticado (req.usuario.id del JWT).
    const nuevoReporte = await createReporte({
      titulo,
      descripcion,
      ubicacion,
      usuarioId: req.usuario.id
    });
    // Invalida caché y publica evento 'reporte.creado' para los clientes conectados.
    delCache('reportes:all');
    publishEvent('reporte.creado', nuevoReporte);
    // Devuelve el reporte creado con código 201 (Created).
    res.status(201).json(nuevoReporte);
  } catch (error) {
    next(error);
  }
};

// Actualiza un reporte existente. Recibe id por URL y campos a actualizar por body.
export const update = async (req, res, next) => {
  try {
    // Extrae los campos opcionales del cuerpo de la petición.
    const { titulo, descripcion, ubicacion, estado } = req.body;

    // Llama al modelo para actualizar el reporte en Supabase.
    const reporteActualizado = await updateReporte(req.params.id, {
      titulo,
      descripcion,
      ubicacion,
      estado
    });

    if (!reporteActualizado) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }

    // Verifica: dueño del reporte o ADMINISTRADOR
    if (req.usuario.rol !== 'ADMINISTRADOR' && reporteActualizado.usuarioId !== req.usuario.id) {
      return res.status(403).json({ error: "No puedes editar un reporte de otro usuario" });
    }

    // Invalida caché y publica evento 'reporte.actualizado' en Redis.
    delCache('reportes:all');
    publishEvent('reporte.actualizado', reporteActualizado);
    res.status(200).json(reporteActualizado);
  } catch (error) {
    next(error);
  }
};

// Elimina un reporte. Solo el dueño o ADMINISTRADOR pueden eliminar.
export const deleteRe = async (req, res, next) => {
  try {
    // Busca el reporte primero para verificar permisos
    const reporte = await getReporteById(req.params.id);
    if (!reporte) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }

    // Verifica: dueño del reporte o ADMINISTRADOR
    if (req.usuario.rol !== 'ADMINISTRADOR' && reporte.usuarioId !== req.usuario.id) {
      return res.status(403).json({ error: "No puedes eliminar un reporte de otro usuario" });
    }

    // Elimina el reporte
    await deleteReporte(req.params.id);

    // Invalida caché y publica evento
    delCache('reportes:all');
    publishEvent('reporte.eliminado', { id: req.params.id });
    res.status(200).json({ mensaje: "Reporte eliminado correctamente" });
  } catch (error) {
    next(error);
  }
};

// Limpia manualmente todo el caché de Redis (solo ADMINISTRADOR via DELETE /api/reportes/cache).
export const clearCache = async (req, res, next) => {
  try {
    const limpiadas = await clearAllCache();
    res.json({ mensaje: `✅ Caché de Redis limpiado. ${limpiadas} clave(s) eliminada(s).` });
  } catch (error) {
    next(error);
  }
};

// Actualiza SOLO el estado de un reporte (Pendiente → En Reparación → Solucionado).
export const patchEstado = async (req, res, next) => {
  try {
    // Extrae el nuevo estado del cuerpo de la petición.
    const { estado } = req.body;

    // Lista de estados válidos permitidos por la lógica de negocio.
    const estadosValidos = ['Pendiente', 'En Reparación', 'Solucionado'];

    // Valida que el estado enviado sea uno de los permitidos.
    if (!estado || !estadosValidos.includes(estado)) {
      return res.status(400).json({
        error: "Bad Request",
        mensaje: `Estado inválido. Valores permitidos: ${estadosValidos.join(", ")}`
      });
    }

    // Actualiza solo el campo estado del reporte en Supabase.
    const reporteActualizado = await updateReporte(req.params.id, { estado });

    if (!reporteActualizado) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }

    // Verifica: dueño del reporte o ADMINISTRADOR
    if (req.usuario.rol !== 'ADMINISTRADOR' && reporteActualizado.usuarioId !== req.usuario.id) {
      return res.status(403).json({ error: "No puedes editar un reporte de otro usuario" });
    }

    // Invalida caché y publica evento 'reporte.actualizado' en Redis.
    delCache('reportes:all');
    publishEvent('reporte.actualizado', reporteActualizado);
    res.status(200).json(reporteActualizado);
  } catch (error) {
    next(error);
  }
};
