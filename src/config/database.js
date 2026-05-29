// Yo, Paul Quispe — Programación IV. Instancio Prisma Client una sola vez
// y lo exporto para que todos los modelos reutilicen la misma conexión a Supabase.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default prisma;
