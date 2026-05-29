// Importa jsonwebtoken para verificar y decodificar tokens JWT.
import jwt from 'jsonwebtoken';

// Clave secreta para firmar/verificar tokens. En producción se lee de variable de entorno.
const JWT_SECRET = process.env.JWT_SECRET || 'clave-segura-estudysync-2024';

// Middleware que se ejecuta ANTES de cada ruta protegida.
// Recibe el token del header Authorization: Bearer <token>.
export const authenticate = (req, res, next) => {
  try {
    // Lee el header Authorization de la petición HTTP entrante.
    const authHeader = req.headers.authorization;
    // Si no existe el header o no empieza con 'Bearer ', rechaza la petición con 401.
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    // Extrae solo el token (la segunda parte después de 'Bearer ').
    const token = authHeader.split(' ')[1];
    // Verifica el token con la clave secreta. Si es válido, devuelve el payload decodificado.
    const decoded = jwt.verify(token, JWT_SECRET);
    // Inyecta los datos del usuario en req.usuario para que el controlador los use después.
    req.usuario = { id: decoded.id, email: decoded.email, rol: decoded.rol };
    // Pasa al siguiente middleware o controlador. El request ya tiene req.usuario disponible.
    next();
  } catch (error) {
    // Si el token expiró, está mal firmado o es inválido, devuelve 401.
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// Middleware que verifica el ROL del usuario autenticado.
// Recibe uno o más roles permitidos, ej: authorize('ADMINISTRADOR').
export const authorize = (...roles) => {
  // Retorna un middleware que captura req, res, next del pipeline de Express.
  return (req, res, next) => {
    // Si req.usuario no existe (no pasó por authenticate) o su rol no está en la lista, deniega.
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: 'Acceso denegado',
        mensaje: `Se requiere rol: ${roles.join(' o ')}`
      });
    }
    // Si el rol es válido, continúa al controlador.
    next();
  };
};

// — Grupo Detoneitors
