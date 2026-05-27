import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'clave-segura-estudysync-2024';

const usuarioSinPassword = {
  id: true,
  nombre: true,
  email: true,
  rol: true
};

export const register = async (req, res, next) => {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        mensaje: 'Faltan campos obligatorios: nombre, email, password'
      });
    }

    const existe = await prisma.usuario.findUnique({ where: { email } });
    if (existe) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: passwordHash,
        rol: rol || 'USUARIO'
      },
      select: usuarioSinPassword
    });

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ token, usuario });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        mensaje: 'Faltan campos obligatorios: email, password'
      });
    }

    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const passwordValido = await bcrypt.compare(password, usuario.password);
    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: _, ...usuarioSinPass } = usuario;

    res.status(200).json({ token, usuario: usuarioSinPass });
  } catch (error) {
    next(error);
  }
};

export const updatePerfil = async (req, res, next) => {
  try {
    const { nombre, email } = req.body;
    const usuarioId = req.usuario.id;

    if (!nombre && !email) {
      return res.status(400).json({
        error: 'Bad Request',
        mensaje: 'Debes enviar al menos nombre o email para actualizar'
      });
    }

    if (email) {
      const duplicado = await prisma.usuario.findFirst({
        where: { email, NOT: { id: usuarioId } }
      });
      if (duplicado) {
        return res.status(409).json({ error: 'El email ya está en uso por otro usuario' });
      }
    }

    const data = {};
    if (nombre) data.nombre = nombre;
    if (email) data.email = email;

    const usuario = await prisma.usuario.update({
      where: { id: usuarioId },
      data,
      select: usuarioSinPassword
    });

    res.status(200).json(usuario);
  } catch (error) {
    next(error);
  }
};

export const getUsuarios = async (req, res, next) => {
  try {
    const { search, rol } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (rol) {
      where.rol = rol;
    }

    const usuarios = await prisma.usuario.findMany({
      where,
      select: usuarioSinPassword,
      orderBy: { nombre: 'asc' }
    });

    res.status(200).json(usuarios);
  } catch (error) {
    next(error);
  }
};
