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
