// Yo, Paul Quispe — Capturo cualquier error no manejado y devuelvo una
// respuesta JSON estructurada con código, timestamp, path y método HTTP.
export const errorHandler = (err, req, res, next) => {
  console.error("Error detectado:", err.message);
  console.error("Stack:", err.stack);

  const statusCode = err.statusCode || 500;
  const mensaje = err.message || "Error interno del servidor";

  res.status(statusCode).json({
    error: mensaje,
    codigo: statusCode,
    timestamp: new Date().toISOString(),
    path: req.path,
    metodo: req.method
  });
};

export class AppError extends Error {
  constructor(mensaje, statusCode = 500) {
    super(mensaje);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}