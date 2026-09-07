import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';
import logger from './config/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import feePaymentRoutes from './routes/feePaymentRoutes.js';
import refundRoutes from './routes/refundRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [process.env.FRONTEND_URL, process.env.ADMIN_FRONTEND_URL],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/fee-payments', feePaymentRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 Handler
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

// Connect to database and start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info(`Server running on http://${process.env.HOST}:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

export default app;
