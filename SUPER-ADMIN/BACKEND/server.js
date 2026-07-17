const app = require('./app');
const prisma = require('./config/prisma');

const PORT = process.env.PORT || 5002;

prisma.$connect()
  .then(() => {
    console.log('Database connected successfully');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });