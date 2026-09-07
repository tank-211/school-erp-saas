import { PrismaClient } from '@prisma/client';
import logger from './logger.js';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error']
});

export const connectDB = async () => {
  try {
    // Test the database connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info('PostgreSQL Connected via Prisma');
    return prisma;
  } catch (error) {
    logger.error(`PostgreSQL Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    await prisma.$disconnect();
    logger.info('PostgreSQL Disconnected');
  } catch (error) {
    logger.error(`PostgreSQL Disconnection Error: ${error.message}`);
  }
};

export default prisma;
