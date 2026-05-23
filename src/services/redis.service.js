import Redis from 'ioredis';
// Importamos broadcast para reenviar los eventos de Redis a todos los clientes SSE.
// Esta es una dependencia UNIDIRECCIONAL: redis.service conoce a sse-manager,
// pero sse-manager NO conoce a redis — evitamos dependencias circulares.
import { broadcast } from './sse-manager.service.js';

const CHANNEL = 'reportes:eventos';

let publisher;
let subscriber;

/**
 * Inicializa las dos conexiones a Redis (publisher + subscriber).
 * Si REDIS_URL no está definida, loguea un warning y no conecta.
 */
export const initRedis = () => {
  if (!process.env.REDIS_URL) {
    console.warn('⚠️  REDIS_URL no definida — Redis Pub/Sub desactivado');
    return;
  }

  publisher = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 200, 3000),
    lazyConnect: true
  });

  subscriber = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => Math.min(times * 200, 3000),
    lazyConnect: true,
    connectionName: 'studysync-subscriber'
  });

  publisher.on('error', (err) =>
    console.error('[Redis Publisher] Error:', err.message)
  );
  subscriber.on('error', (err) =>
    console.error('[Redis Subscriber] Error:', err.message)
  );
};

/**
 * Arranca el subscriber: se conecta y escucha el canal 'reportes:eventos'.
 */
export const startSubscriber = async () => {
  if (!subscriber) {
    console.warn('⚠️  Subscriber no disponible — saltando suscripción');
    return;
  }

  try {
    await subscriber.connect();
    await subscriber.subscribe(CHANNEL);

    // Listener principal: se ejecuta CADA VEZ que alguien publica en el canal 'reportes:eventos'
    // Transformación del mensaje: JSON string → objeto JS → broadcast SSE
    subscriber.on('message', (channel, message) => {
      try {
        // 1. El mensaje llega como string JSON desde Redis
        //    Ej: '{"type":"reporte.creado","timestamp":"...","data":{...}}'
        const parsed = JSON.parse(message);

        // 2. Log para verificar en la terminal del servidor
        console.log(
          `[Redis Pub/Sub] Evento recibido: ${parsed.type}`,
          `— Canal: ${channel}`
        );

        // 3. Reenvía el evento a TODOS los clientes SSE conectados.
        //    broadcast() serializará parsed a "data: JSON\n\n" (formato SSE)
        //    y lo escribirá en cada response del Set.
        broadcast(parsed);
      } catch {
        // Si otro publicador envía un string no-JSON, no explota:
        // capturamos el error, logueamos un warning y seguimos escuchando.
        console.warn('[Redis Pub/Sub] Mensaje malformado (JSON inválido):', message);
      }
    });

    console.log(`👂 Subscriber escuchando en canal: "${CHANNEL}"`);
  } catch (err) {
    console.error('[Redis Subscriber] Error al conectar:', err.message);
  }
};

/**
 * Publica un evento en el canal 'reportes:eventos'.
 * @param {string} type  - Tipo de evento (ej: 'reporte.creado')
 * @param {object} data  - Payload del evento
 */
export const publishEvent = (type, data) => {
  if (!publisher) {
    console.warn(`⚠️  Publisher no disponible — evento "${type}" no se publicó`);
    return;
  }

  const message = JSON.stringify({
    type,
    timestamp: new Date().toISOString(),
    data
  });

  publisher.publish(CHANNEL, message).catch((err) =>
    console.error('[Redis Publisher] Error al publicar:', err.message)
  );
};

/**
 * Cierra ambas conexiones Redis de forma graceful.
 */
export const shutdownRedis = async () => {
  if (subscriber) {
    await subscriber.unsubscribe(CHANNEL);
    await subscriber.quit();
  }
  if (publisher) {
    await publisher.quit();
  }
  console.log('🔌 Conexiones Redis cerradas');
};
