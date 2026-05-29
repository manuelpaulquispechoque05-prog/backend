// Importa las funciones de acceso a datos para comentarios desde el modelo.
import {
  getComentariosByReporte,
  createComentario,
  deleteComentario
} from '../models/comentario.model.js';

// Obtiene todos los comentarios de un reporte específico.
// El reporteId llega por req.params.greporteId gracias a mergeParams:true en las rutas.
export const getByReporte = async (req, res, next) => {
  try {
    // Llama al modelo para traer los comentarios ordenados por fecha ascendente.
    const comentarios = await getComentariosByReporte(req.params.reporteId);
    // Devuelve la lista de comentarios en formato JSON.
    res.status(200).json(comentarios);
  } catch (error) {
    next(error);
  }
};

// Crea un nuevo comentario en un reporte. Recibe 'nota' del body.
export const create = async (req, res, next) => {
  try {
    // Extrae el texto del comentario del cuerpo de la petición.
    const { nota } = req.body;

    // Valida que el campo nota no esté vacío.
    if (!nota) {
      return res.status(400).json({
        error: 'Bad Request',
        mensaje: 'El campo nota es obligatorio'
      });
    }

    // Crea el comentario en Supabase asociado al reporte y al usuario autenticado.
    const comentario = await createComentario({
      nota,
      reporteId: req.params.reporteId,
      usuarioId: req.usuario.id
    });

    // Devuelve el comentario creado con código 201 (Created).
    res.status(201).json(comentario);
  } catch (error) {
    next(error);
  }
};

// Elimina un comentario por su ID (solo ADMINISTRADOR).
export const deleteCom = async (req, res, next) => {
  try {
    // Llama al modelo para eliminar el comentario de Supabase.
    const eliminado = await deleteComentario(req.params.id);

    // Si el comentario no existía, devuelve 404.
    if (!eliminado) {
      return res.status(404).json({ error: 'Comentario no encontrado' });
    }

    // Devuelve confirmación de eliminación.
    res.status(200).json({ mensaje: 'Comentario eliminado correctamente' });
  } catch (error) {
    next(error);
  }
};
