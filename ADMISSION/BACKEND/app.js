import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import database connection (to ensure connection is established)
import pool from './config/db.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import schoolRoutes from './routes/schoolRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import admissionRoutes from './routes/admissionRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import parentRoutes from './routes/parentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import funnelRoutes from './src/routes/funnelRoutes.js';
import communicationRoutes from './routes/communicationRoutes.js';
import emailRoutes from './routes/email.routes.js';
import templateRoutes from './routes/templateRoutes.js';
import smsRoutes from './routes/sms.routes.js';
import whatsappRoutes from './routes/whatsapp.routes.js';
import campaignV2Routes from './routes/campaign.routes.js';
import counselingRoutes from './routes/counselingRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import feesRoutes from './routes/feesRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS configuration
app.use(cors({
  origin: [
    process.env.CORS_ORIGIN || 'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ],
  credentials: true,
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(__dirname, process.env.UPLOAD_DIR || './uploads')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🎓 School ERP Backend API',
    version: '1.0.0',
    status: 'Running',
    endpoints: {
      health:     'GET  /api/health',
      schools:    'GET  /api/schools',
      students:   'GET  /api/students',
      leads:      'GET  /api/leads',
      admissions: 'GET  /api/admissions',
    },
  });
});


// ============================================================================
// API ROUTES
// ============================================================================

// Authentication routes (no auth required for login/signup)
app.use('/api/auth', authRoutes);

// School routes
app.use('/api/schools', schoolRoutes);

// Student routes
app.use('/api/students', studentRoutes);

// Lead routes
app.use('/api/leads', leadRoutes);

// Admission routes
app.use('/api/admissions', admissionRoutes);

// Application routes (multi-step form)
app.use('/api/applications', applicationRoutes);

// Admission resume workflow alias routes
app.use('/api/admission', applicationRoutes);

// Parent routes
app.use('/api/parents', parentRoutes);

// Communication routes
app.use('/api/communication', communicationRoutes);

// Email routes
app.use('/api/email', emailRoutes);

// Template routes
app.use('/api/templates', templateRoutes);

// SMS routes
app.use('/api/sms', smsRoutes);

// Counseling Workspace routes
app.use('/api/counseling', counselingRoutes);

// WhatsApp routes
app.use('/api/whatsapp', whatsappRoutes);

// Campaign routes (v2 strict module)
app.use('/api/campaigns', campaignV2Routes);

// Dashboard routes
app.use('/api', dashboardRoutes);

// User Management routes
app.use('/api/users', userRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Fees routes
app.use('/api/fees', feesRoutes);

// Funnel routes
app.use('/api', funnelRoutes);



// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((error, req, res, next) => {
  if (error?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File too large. Max size is 5MB',
    });
  }

  if (error?.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: error.message || 'File upload failed',
    });
  }

  next(error);
});

// 404 Not Found
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method,
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ [SERVER ERROR]', {
    message: error.message,
    path: req.path,
    method: req.method,
    stack: error.stack,
  });

  res.status(error.statusCode || error.status || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    ...(error.details && { details: error.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
});

export default app;
