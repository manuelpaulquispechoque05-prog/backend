// Importa la instancia singleton de Prisma para consultar Supabase.
import prisma from '../config/database.js';

// Objeto reutilizable que indica a Prisma que incluya los datos del usuario creador
// en cada consulta, pero solo los campos id, nombre y email (nunca la contraseña).
const includeUsuario = {
  usuario: {
    select: { id: true, nombre: true, email: true }
  }
};

// Obtiene TODOS los reportes de la base de datos, ordenados del más reciente al más antiguo.
// Incluye los datos del usuario que creó cada reporte.
export const getReportes = async () => {
  return await prisma.reporte.findMany({
    include: includeUsuario,
    orderBy: { fechaCreacion: 'desc' }
  });
};

// Busca un reporte por su ID único. Retorna el reporte con datos del usuario, o null si no existe.
export const getReporteById = async (id) => {
  return await prisma.reporte.findUnique({
    where: { id },
    include: includeUsuario
  });
};

// Crea un nuevo reporte en Supabase. Recibe un objeto data con titulo, descripcion, ubicacion y usuarioId.
// El estado se asigna como "Pendiente" por defecto. Retorna el reporte creado con datos del usuario.
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

// Actualiza un reporte existente. Recibe el id y un objeto con los campos a modificar.
// Si el reporte no existe (Prisma error P2025), retorna null en vez de lanzar excepción.
export const updateReporte = async (id, data) => {
  try {
    return await prisma.reporte.update({
      where: { id },
      data,
      include: includeUsuario
    });
  } catch (error) {
    // P2025 = registro no encontrado. Lo capturamos para devolver null y manejarlo en el controlador.
    if (error.code === 'P2025') return null;
    throw error;
  }
};

// Elimina un reporte por su ID. Retorna true si se eliminó, false si no existía.
export const deleteReporte = async (id) => {
  try {
    await prisma.reporte.delete({ where: { id } });
    return true;
  } catch (error) {
    // Si el reporte no existe, retorna false en vez de lanzar error.
    if (error.code === 'P2025') return false;
    throw error;
  }
};

// Busca reportes cuya ubicación contenga el texto recibido (búsqueda case-insensitive).
// Ej: getReportesByUbicacion("Aula") encuentra "Aula 204", "Aula 101", etc.
export const getReportesByUbicacion = async (ubicacion) => {
  return await prisma.reporte.findMany({
    where: {
      ubicacion: { contains: ubicacion, mode: 'insensitive' }
    },
    include: includeUsuario,
    orderBy: { fechaCreacion: 'desc' }
  });
};
