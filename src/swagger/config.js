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
