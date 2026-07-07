import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

/**
 * Server Entry Point
 * Starts the Express server
 */

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

const server = app.listen(PORT, HOST, () => {
  console.log('\n┌─────────────────────────────────────────────────┐');
  console.log('│  School ERP Backend Server Started Successfully │');
  console.log('├─────────────────────────────────────────────────┤');
  console.log(`│ Server:      http://${HOST}:${PORT}`.padEnd(49) + '│');
  console.log(`│ Environment: ${(process.env.NODE_ENV || 'development').toUpperCase()}`.padEnd(49) + '│');
  console.log(`│ Database:    ${process.env.DB_NAME}@${process.env.DB_HOST}`.padEnd(49) + '│');
  console.log('│ Health Check: GET /api/health                  │');
  console.log('└─────────────────────────────────────────────────┘\n');

  console.log('Available Endpoints:');
  console.log('  GET    /api/health');
  console.log('  GET    /api/schools');
  console.log('  GET    /api/schools/:id');
  console.log('  POST   /api/schools');
  console.log('  GET    /api/students');
  console.log('  GET    /api/students/:id');
  console.log('  POST   /api/students');
  console.log('  GET    /api/leads');
  console.log('  GET    /api/leads/:id');
  console.log('  POST   /api/leads');
  console.log('  PUT    /api/leads/:id/status');
  console.log('  GET    /api/admissions/stats');
  console.log('  GET    /api/admissions/search?query=');
  console.log('  GET    /api/admissions');
  console.log('  GET    /api/admissions/:applicationId\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

export default server;
