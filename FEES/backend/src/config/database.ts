import { PrismaClient } from '@prisma/client';
import logger from './logger';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

// Log Prisma queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query}`, { duration: `${e.duration}ms` });
  });
}

// Log Prisma errors
prisma.$on('error', (e) => {
  logger.error('Prisma Error', { error: e.message });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down database connection...');
  await prisma.$disconnect();
  process.exit(0);
});

let isConnected = false;

export default prisma;
export const initializeDatabase = async () => {
  await prisma.$connect();
  isConnected = true;
};

export const getDBStatus = () => {
  return isConnected;
};
