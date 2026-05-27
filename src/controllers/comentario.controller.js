import {
  getComentariosByReporte,
  createComentario,
  deleteComentario
} from '../models/comentario.model.js';

export const getByReporte = async (req, res, next) => {
  try {
    const comentarios = await getComentariosByReporte(req.params.reporteId);
    res.status(200).json(comentarios);
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const { nota } = req.body;

    if (!nota) {
      return res.status(400).json({
        error: 'Bad Request',
        mensaje: 'El campo nota es obligatorio'
      });
    }

    const comentario = await createComentario({
      nota,
      reporteId: req.params.reporteId,
      usuarioId: req.usuario.id
    });

    res.status(201).json(comentario);
  } catch (error) {
    next(error);
  }
};

export const deleteCom = async (req, res, next) => {
  try {
    const eliminado = await deleteComentario(req.params.id);

    if (!eliminado) {
      return res.status(404).json({ error: 'Comentario no encontrado' });
    }

    res.status(200).json({ mensaje: 'Comentario eliminado correctamente' });
  } catch (error) {
    next(error);
  }
};
