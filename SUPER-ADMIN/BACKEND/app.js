const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

const defaultCorsOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const corsOrigins = [
  ...new Set([
    ...(process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
      : []),
    ...defaultCorsOrigins,
  ]),
];

const corsOptions = {
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  optionsSuccessStatus: 204,
};

// Middleware
app.use(cors(corsOptions));
app.options('/api/super-admin/login', cors(corsOptions), (req, res) => res.sendStatus(204));
app.options('/api/super-admin/stats', cors(corsOptions), (req, res) => res.sendStatus(204));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Route registration
const superAdminRoutes = require('./routes/superAdminRoutes');
const schoolAuthRoutes = require('./routes/schoolAuthRoutes');
const spAdminRoutes = require('./routes/spAdminRoutes');
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/school', schoolAuthRoutes);
app.use('/api/sp-admin', spAdminRoutes);



// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

module.exports = app;
