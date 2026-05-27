// ============================================================
// sse-manager.service.js — Gestor de clientes SSE
// ============================================================
// ¿Qué es? Es el puente entre Redis y los clientes conectados via SSE.
// ¿Para qué sirve? Mantiene un Set de respuestas HTTP activas y
//   reenvía los eventos de Redis a TODOS los clientes simultáneamente.
// ¿Cómo funciona? addClient() registra un cliente nuevo en el Set.
//   Cuando redis.service.js recibe un evento, llama a broadcast()
//   que itera sobre el Set y escribe "data: JSON\n\n" en cada response.
// ¿Cómo se conecta?
//   - addClient() ← llamado desde reporte.routes.js (GET /stream)
//   - broadcast() ← llamado desde redis.service.js (subscriber.on('message'))
//   - getClientCount() ← opcional, para monitoreo
// Yo, Paul Quispe - Programación IV, diseñé esto para no saturar
// Upstash con una conexión Redis por cada cliente.
// ============================================================

// Set en memoria que almacena las respuestas HTTP (res) de todos los clientes
// conectados al stream SSE. Elegimos Set porque:
// - No permite duplicados: si un cliente ya está, no se agrega de nuevo
// - add/delete/forEach son operaciones O(1), ideales para conexiones que entran/salen
const clients = new Set();

// Agrega un cliente al Set y registra su limpieza automática al desconectarse
export const addClient = (res) => {
  clients.add(res);
  // Cuando el navegador cierra la pestaña, Express emite 'close' en req.
  // Esto asegura que el cliente se elimine del Set sin esperar un broadcast fallido.
  res.on('close', () => clients.delete(res));
};

// Envía un evento SSE (Server-Sent Events) a TODOS los clientes conectados
export const broadcast = (event) => {
  // Formato obligatorio de SSE: "data: <json>\n\n"
  // El prefijo "data: " y los dobles saltos de línea son parte del protocolo EventSource
  const message = `data: ${JSON.stringify(event)}\n\n`;
  clients.forEach((client) => {
    try {
      client.write(message);
    } catch {
      // Si un cliente se desconectó abruptamente (WiFi cortado, laptop cerrado),
      // el evento 'close' pudo no dispararse. El try/catch detecta el write fallido
      // y elimina al zombie del Set para evitar fugas de memoria.
      clients.delete(client);
    }
  });
};

// Útil para monitorear cuántos clientes están conectados en tiempo real
export const getClientCount = () => clients.size;
