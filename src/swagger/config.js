// ============================================================
// swagger/config.js — Configuración de Swagger OpenAPI 3.0
// ============================================================
// ¿Qué es? El archivo que configura swagger-jsdoc para que genere
//   la especificación OpenAPI 3.0 a partir de comentarios en el código.
// ¿Para qué sirve? swagger-jsdoc escanea los archivos .js en busca
//   de comentarios /** @openapi ... */ y construye un objeto JSON
//   con la especificación de la API. Ese objeto se pasa a swagger-ui
//   para renderizar la documentación interactiva en /api-docs.
// ¿Cómo funciona?
//   - Define metadatos: openapi 3.0, título, versión
//   - apis: array de rutas (glob) a archivos .js con comentarios @openapi
//   - swagger-jsdoc lee los archivos como texto plano (con fs)
//   - exporta swaggerSpec para que server.js lo use con swagger-ui
// ¿Cómo se conecta?
//   - swaggerSpec → importado en server.js y pasado a swaggerUi.setup()
//   - Escanea src/routes/*.routes.js (reporte.routes.js) y src/server.js
// Yo, Paul Quispe - Programación IV, configuré esto para que el
// docente pueda probar la API desde /api-docs sin usar Postman.
// ============================================================

import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'StudySync API - Reportes',
      version: '1.0.0',
    },
  },
  apis: ['./src/routes/*.routes.js', './src/server.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
