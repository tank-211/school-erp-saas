import express, { Request, Response, NextFunction } from 'express';
const cors = require('cors');
import 'dotenv/config';
import logger from './config/logger';
import { errorHandler, asyncHandler } from './middleware/errorHandler';
import prisma, { initializeDatabase } from './config/database';

// Import routes
import authRoutes from './routes/authRoutes';
import studentRoutes from './routes/studentRoutes';
import feePaymentRoutes from './routes/feePaymentRoutes';
import refundRoutes from './routes/refundRoutes';
import reportRoutes from './routes/reportRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import invoiceRoutes from './routes/invoiceRoutes';
import paymentRoutes from './routes/paymentRoutes';
import notificationRoutes from './routes/notificationRoutes';
import bulkUploadRoutes from './routes/bulkUploadRoutes';

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    credentials: true,
  })
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.debug(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/fee-payments', feePaymentRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/bulk-upload', bulkUploadRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Received shutdown signal. Starting graceful shutdown...');

  try {
    // Close database connection
    await prisma.$disconnect();
    logger.info('Database connection closed');

    // Close server
    if (server) {
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forcing shutdown after 10 seconds');
        process.exit(1);
      }, 10000);
    }
  } catch (error: any) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
let server: any;

const startServer = async () => {
  try {
    // Initialize database (but don't fail if it's not available in development)
    await initializeDatabase();

    server = app.listen(PORT, () => {
      logger.info(`✅ Server started`, {
        url: `http://${HOST}:${PORT}`,
        environment: process.env.NODE_ENV || 'development',
      });
      logger.info(`📝 Visit http://${HOST}:${PORT}/health to verify server is running`);
    });
  } catch (error: any) {
    logger.error('❌ Failed to start server', { error: error.message });
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;
