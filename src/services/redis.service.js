// Dos conexiones Redis (publisher + subscriber) sobre Upstash.
// Canal 'reportes:eventos': los CRUD publican, el subscriber reenvía a Socket.io.

import Redis from 'ioredis';
import { getIO } from './socket.service.js';

const CHANNEL = 'reportes:eventos';

let publisher;
let subscriber;

/** Crea publisher y subscriber. Warning si REDIS_URL no existe. */
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

/** Conecta y escucha el canal 'reportes:eventos'. */
export const startSubscriber = async () => {
  if (!subscriber) {
    console.warn('⚠️  Subscriber no disponible — saltando suscripción');
    return;
  }

  try {
    await subscriber.connect();
    await subscriber.subscribe(CHANNEL);

    subscriber.on('message', (channel, message) => {
      try {
        const parsed = JSON.parse(message);
        console.log(`[Redis] Evento recibido: ${parsed.type} — Canal: ${channel}`);
        getIO().emit(parsed.type, parsed.data);
      } catch {
        console.warn('[Redis] Mensaje malformado (JSON inválido):', message);
      }
    });

    console.log(`👂 Subscriber escuchando en canal: "${CHANNEL}"`);
  } catch (err) {
    console.error('[Redis Subscriber] Error al conectar:', err.message);
  }
};

/** Publica en canal 'reportes:eventos'. */
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

// ===== CACHÉ =====

/** Guarda en Redis con TTL (segundos). */
export const setCache = (key, data, ttl = 30) => {
  if (!publisher) return;
  publisher.setex(key, ttl, JSON.stringify(data)).catch((err) =>
    console.warn('[Redis Cache] Error al guardar:', err.message)
  );
};

/** Obtiene de Redis o null si no existe. */
export const getCache = async (key) => {
  if (!publisher) return null;
  try {
    const raw = await publisher.get(key);
    if (!raw) return null;
    console.log(`[Redis Cache] HIT — clave: ${key}`);
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/** Elimina una clave específica. */
export const delCache = (key) => {
  if (!publisher) return;
  publisher.del(key).catch((err) =>
    console.warn('[Redis Cache] Error al eliminar:', err.message)
  );
};

/** Limpia todas las claves que empiezan con "reportes:". */
export const clearAllCache = async () => {
  if (!publisher) return 0;
  try {
    const keys = await publisher.keys('reportes:*');
    if (keys.length) await publisher.del(...keys);
    console.log(`[Redis Cache] Limpiadas ${keys.length} claves`);
    return keys.length;
  } catch (err) {
    console.warn('[Redis Cache] Error al limpiar:', err.message);
    return 0;
  }
};

/** Cierra publisher y subscriber. */
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

// — Grupo Detoneitors
