import prisma from '../config/database.js';

export const getReportes = async () => {
  return await prisma.reporte.findMany({
    orderBy: { fechaCreacion: 'desc' }
  });
};

export const getReporteById = async (id) => {
  return await prisma.reporte.findUnique({ where: { id } });
};

export const createReporte = async (data) => {
  return await prisma.reporte.create({
    data: {
      titulo: data.titulo,
      descripcion: data.descripcion || "",
      ubicacion: data.ubicacion,
      estado: "Pendiente"
    }
  });
};

export const updateReporte = async (id, data) => {
  try {
    return await prisma.reporte.update({
      where: { id },
      data
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
    orderBy: { fechaCreacion: 'desc' }
  });
};
