let reportes = [
  {
    id: 1,
    titulo: "Luminaria quemada Aula 204",
    descripcion: "El fluorescente del techo no enciende,影响了 la visibilidad para los estudiantes",
    ubicacion: "Aula 204 - Edificio Principal",
    estado: "Pendiente",
    fechaCreacion: new Date("2024-01-15T08:30:00")
  },
  {
    id: 2,
    titulo: "Fuga de agua Baño Bloque B",
    descripcion: "El lavabo del baño masculino tiene una fuga constante que ha formado un charco",
    ubicacion: "Baño Bloque B - Segundo Piso",
    estado: "En Reparación",
    fechaCreacion: new Date("2024-01-14T10:15:00")
  },
  {
    id: 3,
    titulo: "Computadora dañada Laboratorio 1",
    descripcion: "La computadora del puesto 12 no enciende, el disco duro parece fallar",
    ubicacion: "Laboratorio 1 - Edificio de Informática",
    estado: "Solucionado",
    fechaCreacion: new Date("2024-01-10T14:20:00")
  }
];

let nextId = 4;

export const getReportes = () => {
  return reportes;
};

export const getReporteById = (id) => {
  return reportes.find(r => r.id === id);
};

export const createReporte = (data) => {
  const nuevoReporte = {
    id: nextId++,
    titulo: data.titulo,
    descripcion: data.descripcion || "",
    ubicacion: data.ubicacion,
    estado: "Pendiente",
    fechaCreacion: new Date()
  };
  reportes.push(nuevoReporte);
  return nuevoReporte;
};

export const updateReporte = (id, data) => {
  const index = reportes.findIndex(r => r.id === id);
  if (index === -1) return null;

  reportes[index] = {
    ...reportes[index],
    ...data,
    id: reportes[index].id,
    fechaCreacion: reportes[index].fechaCreacion
  };
  return reportes[index];
};

export const deleteReporte = (id) => {
  const index = reportes.findIndex(r => r.id === id);
  if (index === -1) return false;
  reportes.splice(index, 1);
  return true;
};

export const getReportesByUbicacion = (ubicacion) => {
  return reportes.filter(r =>
    r.ubicacion.toLowerCase().includes(ubicacion.toLowerCase())
  );
};