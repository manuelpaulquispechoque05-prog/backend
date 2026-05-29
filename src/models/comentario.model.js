// Importa la instancia singleton de Prisma para consultar Supabase.
import prisma from '../config/database.js';

// Objeto reutilizable para incluir los datos del autor del comentario (id, nombre, email).
const includeUsuario = {
  usuario: {
    select: { id: true, nombre: true, email: true }
  }
};

// Obtiene todos los comentarios de un reporte específico, ordenados del más antiguo al más nuevo.
// reporteId es el UUID del reporte al que pertenecen los comentarios.
export const getComentariosByReporte = async (reporteId) => {
  return await prisma.comentario.findMany({
    where: { reporteId },
    include: includeUsuario,
    orderBy: { fecha: 'asc' }
  });
};

// Crea un nuevo comentario en Supabase. Recibe data con nota, reporteId y usuarioId.
// Retorna el comentario creado incluyendo los datos del usuario que lo escribió.
export const createComentario = async (data) => {
  return await prisma.comentario.create({
    data: {
      nota: data.nota,
      reporteId: data.reporteId,
      usuarioId: data.usuarioId
    },
    include: includeUsuario
  });
};

// Elimina un comentario por su ID. Retorna true si se eliminó, false si no existía.
export const deleteComentario = async (id) => {
  try {
    await prisma.comentario.delete({ where: { id } });
    return true;
  } catch (error) {
    // P2025 = registro no encontrado. Retorna false en vez de lanzar error.
    if (error.code === 'P2025') return false;
    throw error;
  }
};
