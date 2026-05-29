// OpenAPI 3.0 con security global bearerAuth para Swagger UI.
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'StudySync API - Reportes',
      version: '1.0.0',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.routes.js', './src/server.js'],
};

export const swaggerSpec = swaggerJsdoc(options);

// — Grupo Detoneitors
