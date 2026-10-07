import pkg from '@prisma/client';

const { PrismaClient } = pkg;

// Prisma's defaults for a multi-step transaction are 2s to start and 5s to
// run. On a database connection that has just woken up that is too short and
// the request fails midway ("Transaction not found"). These apply to every
// transaction that does not set its own limits.
const prisma = new PrismaClient({
  transactionOptions: { maxWait: 10000, timeout: 30000 },
});

export default prisma;