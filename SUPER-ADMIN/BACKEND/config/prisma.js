const { PrismaClient } = require("@prisma/client");

// Longer limits than Prisma's 2s/5s defaults, which are too short on a
// database connection that has just woken up (see ADMISSION src/lib/prisma.js)
const prisma = new PrismaClient({
  transactionOptions: { maxWait: 10000, timeout: 30000 },
});

module.exports = prisma;