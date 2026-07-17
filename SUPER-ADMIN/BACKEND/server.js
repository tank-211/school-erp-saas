const app = require('./app');
const prisma = require('./config/prisma');

const PORT = process.env.PORT || 5002;
const HOST = process.env.HOST || '127.0.0.1';

prisma.$connect()
  .then(() => {
    console.log('Database connected successfully');
    app.listen(PORT, HOST, () => {
      console.log(`Server running at http://${HOST}:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });