import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

try {
  await prisma.$connect();
  console.log('CONNECTED');
  await prisma.$disconnect();
} catch (e) {
  console.log('ERROR:', e.message);
  await prisma.$disconnect();
}
