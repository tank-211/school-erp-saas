# Phase 1: Super Admin Foundation & APIs — Plan A (Backend Core Setup)

---
wave: 1
depends_on: []
files_modified:
  - backend/package.json
  - backend/config/db.js
  - backend/app.js
  - backend/server.js
autonomous: true
requirements: [API-01, API-02, API-03, API-04, API-05, ONB-01, ONB-02]
---

## Overview

Set up the Express backend from scratch: database pool, JWT auth for `service_provider_staff`, `verifyInternalStaff` middleware, and full CRUD routes for school management with automatic admin provisioning.

## Plans

### Plan 1: Database Connection Pool & Dependencies

<task>
<title>Install dependencies and configure Postgres connection pool</title>
<read_first>
- backend/package.json
- backend/.env
- backend/config/db.js
</read_first>
<action>
1. Install required npm packages:
   ```bash
   cd backend && npm install pg dotenv bcryptjs jsonwebtoken cors
   ```

2. Update `backend/config/db.js` with a connection pool using environment variables:
   ```js
   const { Pool } = require('pg');
   require('dotenv').config();

   const pool = new Pool({
     host: process.env.DB_HOST,
     port: parseInt(process.env.DB_PORT, 10),
     user: process.env.DB_USER,
     password: process.env.DB_PASSWORD,
     database: process.env.DB_NAME,
     min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
     max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
     idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT, 10) || 30000,
     connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT, 10) || 10000,
   });

   module.exports = pool;
   ```

3. Add `SP_JWT_SECRET=sp_super_secret_key_change_in_production` and `SP_JWT_EXPIRY=8h` to `.env`.
</action>
<acceptance_criteria>
- `backend/package.json` contains `"pg"`, `"dotenv"`, `"bcryptjs"`, `"jsonwebtoken"`, `"cors"` in dependencies
- `backend/config/db.js` contains `new Pool({`
- `backend/config/db.js` contains `module.exports = pool`
- `backend/.env` contains `SP_JWT_SECRET=`
- `backend/.env` contains `SP_JWT_EXPIRY=`
</acceptance_criteria>
</task>

### Plan 2: Express App Setup & Server Entry Point

<task>
<title>Configure Express app with middleware and create server entry point</title>
<read_first>
- backend/app.js
- backend/server.js
- backend/.env
</read_first>
<action>
1. Update `backend/app.js`:
   ```js
   const express = require('express');
   const cors = require('cors');
   require('dotenv').config();

   const app = express();

   // Middleware
   app.use(cors({
     origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
     credentials: process.env.CORS_CREDENTIALS === 'true',
   }));
   app.use(express.json());
   app.use(express.urlencoded({ extended: true }));

   // Health check
   app.get('/api/health', (req, res) => {
     res.json({ status: 'ok', timestamp: new Date().toISOString() });
   });

   // Route registration (will be added in Plan 4)
   // const superAdminRoutes = require('./routes/superAdminRoutes');
   // app.use('/api/super-admin', superAdminRoutes);

   module.exports = app;
   ```

2. Update `backend/server.js`:
   ```js
   const app = require('./app');
   const pool = require('./config/db');

   const PORT = process.env.PORT || 5001;
   const HOST = process.env.HOST || '127.0.0.1';

   pool.query('SELECT NOW()')
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
   ```
</action>
<acceptance_criteria>
- `backend/app.js` contains `const express = require('express')`
- `backend/app.js` contains `app.use(express.json())`
- `backend/app.js` contains `module.exports = app`
- `backend/server.js` contains `const app = require('./app')`
- `backend/server.js` contains `app.listen(PORT`
- Running `node backend/server.js` connects to the database and starts listening
</acceptance_criteria>
</task>

### Plan 3: Super Admin Auth & Middleware

<task>
<title>Create service_provider_staff login route and verifyInternalStaff middleware</title>
<read_first>
- backend/config/db.js
- backend/.env
- backend/database/schema.sql (search for service_provider_staff table definition)
</read_first>
<action>
1. Create `backend/src/middleware/verifyInternalStaff.js`:
   ```js
   const jwt = require('jsonwebtoken');
   const pool = require('../../config/db');

   const verifyInternalStaff = async (req, res, next) => {
     try {
       const authHeader = req.headers.authorization;
       if (!authHeader || !authHeader.startsWith('Bearer ')) {
         return res.status(401).json({ error: 'Access denied. No token provided.' });
       }

       const token = authHeader.split(' ')[1];
       const decoded = jwt.verify(token, process.env.SP_JWT_SECRET);

       // Verify the user still exists and is active in service_provider_staff
       const result = await pool.query(
         'SELECT id, full_name, email, internal_role, is_active FROM service_provider_staff WHERE id = $1',
         [decoded.id]
       );

       if (result.rows.length === 0) {
         return res.status(401).json({ error: 'Invalid token. Staff not found.' });
       }

       if (!result.rows[0].is_active) {
         return res.status(403).json({ error: 'Account deactivated.' });
       }

       req.staffUser = result.rows[0];
       next();
     } catch (err) {
       if (err.name === 'JsonWebTokenError') {
         return res.status(401).json({ error: 'Invalid token.' });
       }
       if (err.name === 'TokenExpiredError') {
         return res.status(401).json({ error: 'Token expired.' });
       }
       return res.status(500).json({ error: 'Internal server error.' });
     }
   };

   module.exports = verifyInternalStaff;
   ```

2. Create `backend/controllers/superAdminAuthController.js`:
   ```js
   const bcrypt = require('bcryptjs');
   const jwt = require('jsonwebtoken');
   const pool = require('../config/db');

   const login = async (req, res) => {
     try {
       const { email, password } = req.body;

       if (!email || !password) {
         return res.status(400).json({ error: 'Email and password are required.' });
       }

       const result = await pool.query(
         'SELECT id, full_name, email, password_hash, internal_role, is_active FROM service_provider_staff WHERE email = $1',
         [email]
       );

       if (result.rows.length === 0) {
         return res.status(401).json({ error: 'Invalid credentials.' });
       }

       const staff = result.rows[0];

       if (!staff.is_active) {
         return res.status(403).json({ error: 'Account deactivated.' });
       }

       const isValidPassword = await bcrypt.compare(password, staff.password_hash);
       if (!isValidPassword) {
         return res.status(401).json({ error: 'Invalid credentials.' });
       }

       const token = jwt.sign(
         { id: staff.id, email: staff.email, internal_role: staff.internal_role },
         process.env.SP_JWT_SECRET,
         { expiresIn: process.env.SP_JWT_EXPIRY || '8h' }
       );

       // Update last_login
       await pool.query(
         'UPDATE service_provider_staff SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
         [staff.id]
       );

       return res.json({
         message: 'Login successful',
         token,
         user: {
           id: staff.id,
           full_name: staff.full_name,
           email: staff.email,
           internal_role: staff.internal_role,
         },
       });
     } catch (err) {
       console.error('Login error:', err);
       return res.status(500).json({ error: 'Internal server error.' });
     }
   };

   module.exports = { login };
   ```
</action>
<acceptance_criteria>
- `backend/src/middleware/verifyInternalStaff.js` contains `jwt.verify(token, process.env.SP_JWT_SECRET)`
- `backend/src/middleware/verifyInternalStaff.js` contains `req.staffUser = result.rows[0]`
- `backend/controllers/superAdminAuthController.js` contains `bcrypt.compare(password, staff.password_hash)`
- `backend/controllers/superAdminAuthController.js` contains `jwt.sign(`
- `backend/controllers/superAdminAuthController.js` contains `internal_role: staff.internal_role`
- Login returns 401 for missing credentials and 403 for deactivated accounts
</acceptance_criteria>
</task>

### Plan 4: School Management Controller & Auto-Provisioning

<task>
<title>Create school CRUD controller with automatic admin provisioning on school creation</title>
<read_first>
- backend/database/schema.sql (search for CREATE TABLE school and CREATE TABLE app_user)
- backend/config/db.js
</read_first>
<action>
1. Create `backend/controllers/superAdminSchoolController.js`:
   ```js
   const bcrypt = require('bcryptjs');
   const pool = require('../config/db');

   // GET /api/super-admin/schools — Fetch all schools
   const getAllSchools = async (req, res) => {
     try {
       const result = await pool.query(
         `SELECT id, name, email, phone, address, city, state, postal_code, country,
                 principal_name, status, plan_type, is_active, expiry_date,
                 created_at, updated_at
          FROM school ORDER BY created_at DESC`
       );
       return res.json({ schools: result.rows });
     } catch (err) {
       console.error('Get schools error:', err);
       return res.status(500).json({ error: 'Failed to fetch schools.' });
     }
   };

   // POST /api/super-admin/schools — Create school + provision first admin
   const createSchool = async (req, res) => {
     const client = await pool.connect();
     try {
       await client.query('BEGIN');

       const {
         name, email, phone, address, city, state, postal_code, country,
         principal_name, plan_type, expiry_date,
         admin_name, admin_email, admin_password
       } = req.body;

       // Validate required fields
       if (!name || !admin_name || !admin_email || !admin_password) {
         return res.status(400).json({
           error: 'School name, admin name, admin email, and admin password are required.'
         });
       }

       // Insert school
       const schoolResult = await client.query(
         `INSERT INTO school (name, email, phone, address, city, state, postal_code,
           country, principal_name, plan_type, is_active, expiry_date, status, created_by)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE,$11,'active',$12)
          RETURNING id, name, plan_type, expiry_date`,
         [name, email, phone, address, city, state, postal_code,
          country, principal_name, plan_type || 'trial', expiry_date,
          req.staffUser.full_name]
       );

       const school = schoolResult.rows[0];

       // Hash admin password and provision first admin in app_user
       const hashedPassword = await bcrypt.hash(admin_password, 10);

       const adminResult = await client.query(
         `INSERT INTO app_user (school_id, name, email, password_hash, role, status, created_by)
          VALUES ($1, $2, $3, $4, 'admin', 'active', $5)
          RETURNING id, name, email, role`,
         [school.id, admin_name, admin_email, hashedPassword, req.staffUser.full_name]
       );

       await client.query('COMMIT');

       return res.status(201).json({
         message: 'School created and admin provisioned successfully.',
         school,
         admin: adminResult.rows[0],
       });
     } catch (err) {
       await client.query('ROLLBACK');
       console.error('Create school error:', err);
       if (err.code === '23505') {
         return res.status(409).json({ error: 'School name or admin email already exists.' });
       }
       return res.status(500).json({ error: 'Failed to create school.' });
     } finally {
       client.release();
     }
   };

   // PATCH /api/super-admin/schools/:id — Update school status/expiry
   const updateSchool = async (req, res) => {
     try {
       const { id } = req.params;
       const { is_active, expiry_date, plan_type, status } = req.body;

       const fields = [];
       const values = [];
       let paramIndex = 1;

       if (is_active !== undefined) {
         fields.push(`is_active = $${paramIndex++}`);
         values.push(is_active);
       }
       if (expiry_date !== undefined) {
         fields.push(`expiry_date = $${paramIndex++}`);
         values.push(expiry_date);
       }
       if (plan_type !== undefined) {
         fields.push(`plan_type = $${paramIndex++}`);
         values.push(plan_type);
       }
       if (status !== undefined) {
         fields.push(`status = $${paramIndex++}`);
         values.push(status);
       }

       if (fields.length === 0) {
         return res.status(400).json({ error: 'No fields to update.' });
       }

       fields.push(`updated_at = CURRENT_TIMESTAMP`);
       fields.push(`updated_by = $${paramIndex++}`);
       values.push(req.staffUser.full_name);
       values.push(id);

       const result = await pool.query(
         `UPDATE school SET ${fields.join(', ')} WHERE id = $${paramIndex}
          RETURNING id, name, is_active, expiry_date, plan_type, status`,
         values
       );

       if (result.rows.length === 0) {
         return res.status(404).json({ error: 'School not found.' });
       }

       return res.json({
         message: 'School updated successfully.',
         school: result.rows[0],
       });
     } catch (err) {
       console.error('Update school error:', err);
       return res.status(500).json({ error: 'Failed to update school.' });
     }
   };

   module.exports = { getAllSchools, createSchool, updateSchool };
   ```
</action>
<acceptance_criteria>
- `backend/controllers/superAdminSchoolController.js` contains `INSERT INTO school`
- `backend/controllers/superAdminSchoolController.js` contains `INSERT INTO app_user`
- `backend/controllers/superAdminSchoolController.js` contains `bcrypt.hash(admin_password, 10)`
- `backend/controllers/superAdminSchoolController.js` contains `await client.query('BEGIN')`
- `backend/controllers/superAdminSchoolController.js` contains `await client.query('ROLLBACK')`
- POST handler returns both `school` and `admin` objects in the response
- PATCH handler dynamically builds UPDATE query from provided fields
</acceptance_criteria>
</task>

### Plan 5: Routes & App Integration

<task>
<title>Create super admin routes and wire everything into app.js</title>
<read_first>
- backend/app.js
- backend/controllers/superAdminAuthController.js
- backend/controllers/superAdminSchoolController.js
- backend/src/middleware/verifyInternalStaff.js
</read_first>
<action>
1. Create `backend/routes/superAdminRoutes.js`:
   ```js
   const express = require('express');
   const router = express.Router();
   const verifyInternalStaff = require('../src/middleware/verifyInternalStaff');
   const { login } = require('../controllers/superAdminAuthController');
   const { getAllSchools, createSchool, updateSchool } = require('../controllers/superAdminSchoolController');

   // Auth (no middleware needed)
   router.post('/login', login);

   // Protected routes
   router.get('/schools', verifyInternalStaff, getAllSchools);
   router.post('/schools', verifyInternalStaff, createSchool);
   router.patch('/schools/:id', verifyInternalStaff, updateSchool);

   module.exports = router;
   ```

2. Update `backend/app.js` — uncomment and add the route registration:
   ```js
   const superAdminRoutes = require('./routes/superAdminRoutes');
   app.use('/api/super-admin', superAdminRoutes);
   ```

3. Add a global error handler at the bottom of `app.js` before `module.exports`:
   ```js
   // Global error handler
   app.use((err, req, res, next) => {
     console.error('Unhandled error:', err);
     res.status(500).json({ error: 'Internal server error.' });
   });
   ```
</action>
<acceptance_criteria>
- `backend/routes/superAdminRoutes.js` contains `router.post('/login', login)`
- `backend/routes/superAdminRoutes.js` contains `router.get('/schools', verifyInternalStaff, getAllSchools)`
- `backend/routes/superAdminRoutes.js` contains `router.post('/schools', verifyInternalStaff, createSchool)`
- `backend/routes/superAdminRoutes.js` contains `router.patch('/schools/:id', verifyInternalStaff, updateSchool)`
- `backend/app.js` contains `app.use('/api/super-admin', superAdminRoutes)`
- `backend/app.js` contains error handler middleware with `(err, req, res, next)`
</acceptance_criteria>
</task>

## Verification

### Must-Haves
- [ ] `POST /api/super-admin/login` authenticates against `service_provider_staff` and returns JWT with `internal_role`
- [ ] `verifyInternalStaff` middleware validates JWT and checks `is_active` status
- [ ] `GET /api/super-admin/schools` returns all school records (protected)
- [ ] `POST /api/super-admin/schools` creates a school AND auto-provisions the first admin in `app_user` (transactional)
- [ ] `PATCH /api/super-admin/schools/:id` updates `is_active`, `expiry_date`, `plan_type`, or `status`
- [ ] All protected routes return 401 without a valid token

### Nice-to-Haves
- [ ] Rate limiting on login endpoint
- [ ] Input validation middleware (express-validator)
