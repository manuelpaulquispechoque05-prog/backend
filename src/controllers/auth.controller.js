// Importa bcryptjs para hashear y comparar contraseñas de forma segura.
import bcrypt from 'bcryptjs';
// Importa jsonwebtoken para generar y verificar tokens JWT de autenticación.
import jwt from 'jsonwebtoken';
// Importa la instancia singleton de Prisma para consultar la base de datos en Supabase.
import prisma from '../config/database.js';
// Importa publishEvent para notificar a Redis cuando se crea/actualiza/elimina un usuario.
import { publishEvent } from '../services/redis.service.js';
// Importa getIO para emitir 'usuario-conectado' directo por Socket.io (sin pasar por Redis).
import { getIO } from '../services/socket.service.js';

// Clave secreta para firmar los tokens JWT. Se lee de variable de entorno o usa un valor por defecto.
const JWT_SECRET = process.env.JWT_SECRET || 'clave-segura-estudysync-2024';

// Define qué campos del usuario se devuelven en las respuestas (NUNCA se incluye la contraseña).
const usuarioSinPassword = {
  id: true,
  nombre: true,
  email: true,
  rol: true
};

// Registra un nuevo usuario. Recibe nombre, email, password y opcionalmente rol desde el body.
export const register = async (req, res, next) => {
  try {
    // Extrae los campos del cuerpo de la petición HTTP.
    const { nombre, email, password, rol } = req.body;

    // Valida que los campos obligatorios estén presentes.
    if (!nombre || !email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        mensaje: 'Faltan campos obligatorios: nombre, email, password'
      });
    }

    // Busca si ya existe un usuario con ese email en la base de datos.
    const existe = await prisma.usuario.findUnique({ where: { email } });
    // Si el email ya está registrado, devuelve 409 Conflict.
    if (existe) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    // Genera un salt aleatorio de 10 rondas para el hash de la contraseña.
    const salt = await bcrypt.genSalt(10);
    // Hashea la contraseña con el salt generado.
    const passwordHash = await bcrypt.hash(password, salt);

    // Crea el usuario en Supabase con los datos proporcionados. No devuelve la contraseña.
    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: passwordHash,
        rol: rol || 'USUARIO'
      },
      select: usuarioSinPassword
    });

    // Genera un token JWT con los datos del usuario, válido por 24 horas.
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Devuelve el token y los datos del usuario (sin contraseña).
    res.status(201).json({ token, usuario });
  } catch (error) {
    // Pasa cualquier error al manejador global de errores (errorHandler.js).
    next(error);
  }
};

// Inicia sesión. Recibe email y password del body. Devuelve token JWT y datos del usuario.
export const login = async (req, res, next) => {
  try {
    // Extrae email y password del cuerpo de la petición.
    const { email, password } = req.body;

    // Valida que ambos campos estén presentes.
    if (!email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        mensaje: 'Faltan campos obligatorios: email, password'
      });
    }

    // Busca al usuario por email en la base de datos.
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    // Si el usuario no existe, devuelve 401 sin especificar si es el email o la contraseña.
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Compara la contraseña enviada con el hash almacenado en la base de datos.
    const passwordValido = await bcrypt.compare(password, usuario.password);
    // Si la contraseña no coincide, devuelve 401.
    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Genera un token JWT con los datos del usuario, válido por 24 horas.
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Extrae la contraseña del objeto usuario para no enviarla en la respuesta.
    const { password: _, ...usuarioSinPass } = usuario;

    // Devuelve el token y los datos del usuario (sin contraseña).
    res.status(200).json({ token, usuario: usuarioSinPass });

    // Emite un evento 'usuario-conectado' directamente por Socket.io (sin Redis)
    // para que los clientes conectados vean quién inició sesión.
    try {
      getIO().emit('usuario-conectado', {
        nombre: usuario.nombre,
        email: usuario.email,
        hora: new Date().toISOString()
      });
    } catch {}  // Si Socket.io falla, no interrumpe el login.
  } catch (error) {
    next(error);
  }
};

// Actualiza el perfil del usuario autenticado. Recibe nombre y/o email del body.
export const updatePerfil = async (req, res, next) => {
  try {
    // Extrae nombre y email del cuerpo de la petición.
    const { nombre, email } = req.body;
    // Obtiene el ID del usuario autenticado desde req.usuario (inyectado por auth.middleware.js).
    const usuarioId = req.usuario.id;

    // Valida que al menos un campo haya sido enviado para actualizar.
    if (!nombre && !email) {
      return res.status(400).json({
        error: 'Bad Request',
        mensaje: 'Debes enviar al menos nombre o email para actualizar'
      });
    }

    // Si se envió un nuevo email, verifica que no esté en uso por otro usuario.
    if (email) {
      const duplicado = await prisma.usuario.findFirst({
        where: { email, NOT: { id: usuarioId } }
      });
      // Si otro usuario ya tiene ese email, devuelve 409 Conflict.
      if (duplicado) {
        return res.status(409).json({ error: 'El email ya está en uso por otro usuario' });
      }
    }

    // Construye dinámicamente el objeto data solo con los campos que se enviaron.
    const data = {};
    if (nombre) data.nombre = nombre;
    if (email) data.email = email;

    // Actualiza el usuario en Supabase con los datos proporcionados.
    const usuario = await prisma.usuario.update({
      where: { id: usuarioId },
      data,
      select: usuarioSinPassword
    });

    // Devuelve los datos actualizados del usuario (sin contraseña).
    res.status(200).json(usuario);
  } catch (error) {
    next(error);
  }
};

// Crea un nuevo usuario (solo ADMINISTRADOR). Recibe nombre, email, password y opcionalmente rol.
export const adminCreateUser = async (req, res, next) => {
  try {
    // Extrae los campos del cuerpo de la petición.
    const { nombre, email, password, rol } = req.body;

    // Valida que los campos obligatorios estén presentes.
    if (!nombre || !email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        mensaje: 'Faltan campos obligatorios: nombre, email, password'
      });
    }

    // Verifica que el email no esté ya registrado.
    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    // Genera salt y hash para la contraseña.
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Crea el usuario en Supabase.
    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: passwordHash,
        rol: rol || 'USUARIO'
      },
      select: usuarioSinPassword
    });

    // Devuelve el usuario creado.
    res.status(201).json(usuario);
    // Publica evento 'usuario.creado' en Redis para que Socket.io lo reenvíe a los clientes.
    publishEvent('usuario.creado', usuario);
  } catch (error) {
    next(error);
  }
};

// Actualiza un usuario existente (solo ADMINISTRADOR). Recibe id por URL y datos por body.
export const adminUpdateUser = async (req, res, next) => {
  try {
    // Obtiene el ID del usuario a actualizar desde los parámetros de la URL.
    const { id } = req.params;
    // Extrae los campos opcionales del cuerpo de la petición.
    const { nombre, email, rol } = req.body;

    // Valida que al menos un campo haya sido enviado.
    if (!nombre && !email && !rol) {
      return res.status(400).json({
        error: 'Bad Request',
        mensaje: 'Debes enviar al menos nombre, email o rol para actualizar'
      });
    }

    // Si se cambia el email, verifica que no esté en uso por otro usuario.
    if (email) {
      const duplicado = await prisma.usuario.findFirst({
        where: { email, NOT: { id } }
      });
      if (duplicado) {
        return res.status(409).json({ error: 'El email ya está en uso por otro usuario' });
      }
    }

    // Construye el objeto data solo con los campos enviados.
    const data = {};
    if (nombre) data.nombre = nombre;
    if (email) data.email = email;
    if (rol) data.rol = rol;

    // Actualiza el usuario en Supabase.
    const usuario = await prisma.usuario.update({
      where: { id },
      data,
      select: usuarioSinPassword
    });

    // Devuelve el usuario actualizado.
    res.status(200).json(usuario);
    // Publica evento 'usuario.actualizado' en Redis para notificar a los clientes.
    publishEvent('usuario.actualizado', usuario);
  } catch (error) {
    // Si Prisma lanza P2025 (registro no encontrado), devuelve 404.
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    next(error);
  }
};

// Elimina un usuario (solo ADMINISTRADOR). Recibe id por URL.
export const adminDeleteUser = async (req, res, next) => {
  try {
    // Obtiene el ID del usuario a eliminar desde los parámetros de la URL.
    const { id } = req.params;

    // Evita que el administrador se elimine a sí mismo.
    if (id === req.usuario.id) {
      return res.status(400).json({
        error: 'Bad Request',
        mensaje: 'No puedes eliminarte a ti mismo'
      });
    }

    // Elimina el usuario de Supabase. Si no existe, Prisma lanza P2025.
    await prisma.usuario.delete({ where: { id } });

    // Devuelve mensaje de confirmación.
    res.status(200).json({ mensaje: 'Usuario eliminado correctamente' });
    // Publica evento 'usuario.eliminado' en Redis para notificar a los clientes.
    publishEvent('usuario.eliminado', { id });
  } catch (error) {
    // Si el usuario no existe, devuelve 404.
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    next(error);
  }
};

// Lista usuarios con búsqueda y filtro opcional por rol (solo ADMINISTRADOR).
export const getUsuarios = async (req, res, next) => {
  try {
    // Obtiene parámetros de búsqueda y filtro desde la query string (ej: ?search=paul&rol=ADMINISTRADOR).
    const { search, rol } = req.query;

    // Construye dinámicamente la condición WHERE para la consulta.
    const where = {};

    // Si hay texto de búsqueda, busca por nombre O email (case-insensitive).
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Si hay filtro por rol, lo agrega a la condición.
    if (rol) {
      where.rol = rol;
    }

    // Ejecuta la consulta en Supabase: busca usuarios, sin contraseña, ordenados por nombre.
    const usuarios = await prisma.usuario.findMany({
      where,
      select: usuarioSinPassword,
      orderBy: { nombre: 'asc' }
    });

    // Devuelve la lista de usuarios encontrados.
    res.status(200).json(usuarios);
  } catch (error) {
    next(error);
  }
};
