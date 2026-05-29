// Consultas CRUD contra la tabla reportes en Supabase via Prisma.
import prisma from '../config/database.js';

const includeUsuario = {
  usuario: {
    select: { id: true, nombre: true, email: true }
  }
};

export const getReportes = async () => {
  return await prisma.reporte.findMany({
    include: includeUsuario,
    orderBy: { fechaCreacion: 'desc' }
  });
};

export const getReporteById = async (id) => {
  return await prisma.reporte.findUnique({
    where: { id },
    include: includeUsuario
  });
};

export const createReporte = async (data) => {
  return await prisma.reporte.create({
    data: {
      titulo: data.titulo,
      descripcion: data.descripcion || "",
      ubicacion: data.ubicacion,
      estado: "Pendiente",
      usuarioId: data.usuarioId
    },
    include: includeUsuario
  });
};

export const updateReporte = async (id, data) => {
  try {
    return await prisma.reporte.update({
      where: { id },
      data,
      include: includeUsuario
    });
  } catch (error) {
    if (error.code === 'P2025') return null;
    throw error;
  }
};

export const deleteReporte = async (id) => {
  try {
    await prisma.reporte.delete({ where: { id } });
    return true;
  } catch (error) {
    if (error.code === 'P2025') return false;
    throw error;
  }
};

export const getReportesByUbicacion = async (ubicacion) => {
  return await prisma.reporte.findMany({
    where: {
      ubicacion: { contains: ubicacion, mode: 'insensitive' }
    },
    include: includeUsuario,
    orderBy: { fechaCreacion: 'desc' }
  });
};
