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
import { publishEvent } from '../services/redis.service.js';
// Importa Prisma directamente para consultas puntuales que no están en el modelo.
import prisma from '../config/database.js';

// Obtiene todos los reportes, opcionalmente filtrados por ubicación (query param ?ubicacion=...).
export const getAll = async (req, res, next) => {
  try {
    // Lee el query parameter 'ubicacion' de la URL (ej: /api/reportes?ubicacion=Aula).
    const { ubicacion } = req.query;

    // Variable que almacenará la lista de reportes obtenida.
    let reportes;
    // Si se especificó una ubicación, filtra por ella; si no, trae todos los reportes.
    if (ubicacion) {
      reportes = await getReportesByUbicacion(ubicacion);
    } else {
      reportes = await getReportes();
    }

    // Devuelve la lista de reportes en formato JSON con código 200.
    res.status(200).json(reportes);
  } catch (error) {
    // Pasa cualquier error al manejador global (errorHandler.js).
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

    // ID fijo del administrador por defecto (usado si el reporte se crea desde Swagger sin token).
    const ADMIN_ID = "b32a0547-3ffb-41d4-91be-9820df02bbd4";

    // Usa el ID del usuario autenticado o el ADMIN_ID si no hay token.
    let usuarioId = req.usuario?.id || ADMIN_ID;

    // Verifica que el usuarioId exista realmente en la base de datos.
    try {
      await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    } catch {
      // Si el usuario no existe (ej: ADMIN_ID fue borrado), asigna null.
      usuarioId = null;
    }

    // Crea el reporte en Supabase a través del modelo.
    const nuevoReporte = await createReporte({
      titulo,
      descripcion,
      ubicacion,
      usuarioId
    });
    // Publica evento 'reporte.creado' en Redis para que Socket.io lo reenvíe a los clientes conectados.
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

    // Si updateReporte devolvió null, el reporte no existe (Prisma lanzó P2025, el modelo lo captura).
    if (!reporteActualizado) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }

    // Publica evento 'reporte.actualizado' en Redis para notificar a los clientes.
    publishEvent('reporte.actualizado', reporteActualizado);
    // Devuelve el reporte actualizado.
    res.status(200).json(reporteActualizado);
  } catch (error) {
    next(error);
  }
};

// Elimina un reporte. Recibe id por URL.
export const deleteRe = async (req, res, next) => {
  try {
    // Llama al modelo para eliminar el reporte de Supabase.
    const eliminado = await deleteReporte(req.params.id);

    // Si deleteReporte devolvió false, el reporte no existía.
    if (!eliminado) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }

    // Publica evento 'reporte.eliminado' en Redis con el ID del reporte borrado.
    publishEvent('reporte.eliminado', { id: req.params.id });
    // Devuelve confirmación de eliminación.
    res.status(200).json({ mensaje: "Reporte eliminado correctamente" });
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

    // Si el reporte no existe, devuelve 404.
    if (!reporteActualizado) {
      return res.status(404).json({ error: "Reporte no encontrado" });
    }

    // Publica evento 'reporte.actualizado' en Redis (mismo evento que update, cambia el tipo de dato).
    publishEvent('reporte.actualizado', reporteActualizado);
    // Devuelve el reporte con el estado actualizado.
    res.status(200).json(reporteActualizado);
  } catch (error) {
    next(error);
  }
};
