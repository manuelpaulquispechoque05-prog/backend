// Yo, Paul Quispe — Capa de acceso a datos para comentarios. Operaciones
// CRUD básicas contra la tabla comentarios en Supabase via Prisma.
import prisma from '../config/database.js';

const includeUsuario = {
  usuario: {
    select: { id: true, nombre: true, email: true }
  }
};

export const getComentariosByReporte = async (reporteId) => {
  return await prisma.comentario.findMany({
    where: { reporteId },
    include: includeUsuario,
    orderBy: { fecha: 'asc' }
  });
};

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

export const deleteComentario = async (id) => {
  try {
    await prisma.comentario.delete({ where: { id } });
    return true;
  } catch (error) {
    if (error.code === 'P2025') return false;
    throw error;
  }
};
