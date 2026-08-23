# School ERP Backend - Node.js + Express.js + PostgreSQL

A professional, production-ready Node.js backend for a School Admission CRM System with complete PostgreSQL integration.

## 📋 Quick Overview

```
School ERP Backend
├── config/          Database connection configuration
├── controllers/     Request handlers and business logic
├── routes/          API endpoint definitions
├── database/        SQL schema and migrations
├── app.js           Express application setup
└── server.js        Server entry point
```

## ✨ Features

✅ **Multi-tenant Architecture** - Support multiple schools  
✅ **PostgreSQL Database** - Robust relational database  
✅ **Connection Pooling** - Optimized database performance  
✅ **RESTful API** - Well-structured endpoints  
✅ **Error Handling** - Comprehensive error management  
✅ **Environment Variables** - Secure configuration  
✅ **CORS Enabled** - Cross-origin request support  
✅ **Logging** - Request logging middleware  
✅ **Sample Data** - Pre-loaded test data

## 🚀 Quick Start

### Prerequisites

- Node.js v14+
- PostgreSQL v12+
- npm or yarn

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Create .env file
cp .env.example .env

# 3. Update .env with your PostgreSQL credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_USER=postgres
# DB_PASSWORD=tanmay@123
# DB_NAME=admission

# 4. Create database and load schema
psql -U postgres -c "CREATE DATABASE admission;"
psql -U postgres -d admission -f database/schema.sql

# 5. Start the server
npm start
```

Expected output:

```
┌─────────────────────────────────────────────────┐
│  School ERP Backend Server Started Successfully │
├─────────────────────────────────────────────────┤
│ Server:      http://localhost:5000              │
│ Environment: DEVELOPMENT                        │
│ Database:    admission@localhost                │
│ Health Check: GET /api/health                   │
└─────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
backend/
│
├── config/
│   └── db.js                      # PostgreSQL connection pool
│
├── controllers/
│   ├── schoolController.js        # School business logic
│   ├── studentController.js       # Student business logic
│   └── leadController.js          # Lead management logic
│
├── routes/
│   ├── schoolRoutes.js            # School API routes
│   ├── studentRoutes.js           # Student API routes
│   └── leadRoutes.js              # Lead API routes
│
├── database/
│   ├── schema.sql                 # Complete database schema
│   └── [Other SQL files]
│
├── app.js                         # Express application setup
├── server.js                      # Server entry point
├── .env                           # Environment variables
├── .env.example                   # Example env file
├── package.json                   # Dependencies
└── README.md                      # Documentation
```

## 🔗 API Endpoints

### Schools

```
GET    /api/schools              # Get all schools
GET    /api/schools/:id          # Get school by ID
POST   /api/schools              # Create new school
```

### Students

```
GET    /api/students             # Get all students (paginated)
GET    /api/students/:id         # Get student with details
POST   /api/students             # Create new student
```

### Leads

```
GET    /api/leads                # Get all leads (with filters)
GET    /api/leads/:id            # Get lead by ID
POST   /api/leads                # Create new lead
PUT    /api/leads/:id/status     # Update lead status
```

### Health Check

```
GET    /api/health               # Server health check
```

## 📊 Database Schema

### Core Tables

1. **school** - School information (multi-tenant)
2. **academic_year** - Academic periods
3. **school_class** - Grade/Class definitions
4. **section** - Class sections (A, B, C)
5. **student** - Student records
6. **parent_detail** - Parent/Guardian info
7. **lead** - Prospective student leads
8. **admission** - Student admission records
9. **fee_structure** - Fee configuration
10. **student_fee_assignment** - Fee assignments
11. **invoice** - Fee invoices
12. **payment** - Payment records

### Key Features

- ✅ Foreign key relationships
- ✅ Unique constraints
- ✅ Check constraints for validation
- ✅ Indexes for performance
- ✅ Cascading deletes
- ✅ Timestamps (created_at, updated_at)

## 🔧 Configuration

### Environment Variables (.env)

```env
# Server
NODE_ENV=development
PORT=5000
HOST=localhost

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tanmay@123
DB_NAME=admission

# Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# CORS
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

# Logging
LOG_LEVEL=debug
```

## 📝 Code Examples

### Get All Schools

```bash
curl http://localhost:5000/api/schools
```

### Create a Student

```bash
curl -X POST http://localhost:5000/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "school_id": 1,
    "admission_number": "ADM001",
    "first_name": "Rohan",
    "last_name": "Singh",
    "email": "rohan@example.com"
  }'
```

### Get Interested Leads

```bash
curl "http://localhost:5000/api/leads?school_id=1&status=interested"
```

### Update Lead Status

```bash
curl -X PUT http://localhost:5000/api/leads/1/status \
  -H "Content-Type: application/json" \
  -d '{
    "follow_up_status": "converted",
    "notes": "Student admitted"
  }'
```

## 🗂️ Module Explanation

### config/db.js

**Purpose:** Database connection management  
**Key Functions:**

- Creates connection pool for PostgreSQL
- Handles connection errors
- Provides query execution with error handling
- Manages connection lifecycle

```javascript
const pool = require("./config/db");
const result = await pool.query("SELECT * FROM school");
```

### controllers/

**Purpose:** Request handlers and business logic  
**Pattern:**

- Receives HTTP request
- Validates input
- Calls database
- Formats response
- Sends response

```javascript
const getAllSchools = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM school");
    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
```

### routes/

**Purpose:** Map HTTP requests to controllers  
**Pattern:**

- Define endpoint path
- Specify HTTP method
- Link to controller function

```javascript
router.get("/", schoolController.getAllSchools);
router.get("/:id", schoolController.getSchoolById);
router.post("/", schoolController.createSchool);
```

### database/schema.sql

**Purpose:** Database schema definition  
**Contains:**

- Table definitions
- Foreign key relationships
- Indexes
- Check constraints
- Sample data

## 🚀 Available Scripts

```bash
# Development server with hot reload
npm run dev

# Start production server
npm start

# Run tests (if configured)
npm test
```

## 📚 Documentation

- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Complete database setup guide
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API endpoints reference
- [database/schema.sql](./database/schema.sql) - Database schema

## 🔐 Security Best Practices

✅ Environment variables for sensitive data  
✅ Input validation and sanitization  
✅ Error handling without exposing stack traces  
✅ CORS configuration  
✅ Connection pooling to prevent exhaustion  
✅ SQL injection prevention via parameterized queries  
✅ Rate limiting ready (middleware structure)

## 🛠️ Troubleshooting

### Database Connection Error

```
Check:
- PostgreSQL is running
- Credentials in .env are correct
- Database 'admission' exists
```

### Port Already in Use

```bash
# Change PORT in .env
PORT=5001
```

### Schema Not Loaded

```bash
# Reload schema
psql -U postgres -d admission -f database/schema.sql
```

## 📈 Performance Tips

1. **Connection Pooling** - Already configured (min: 2, max: 10)
2. **Query Optimization** - Use indexes on frequently queried columns
3. **Pagination** - Use limit/offset for large datasets
4. **Caching** - Implement Redis for frequently accessed data
5. **Monitoring** - Log slow queries

## 🤝 Contributing

1. Follow existing code style
2. Add error handling for new endpoints
3. Document new controllers
4. Test with sample data
5. Update API documentation

## 📞 Support

- Check [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for endpoint details
- See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for database issues
- Review [database/schema.sql](./database/schema.sql) for table structure

## 📄 License

MIT License - Use freely in your projects

---

## ✅ Checklist for Production

- [ ] Change database password
- [ ] Use environment-specific configs
- [ ] Enable HTTPS
- [ ] Set up error logging
- [ ] Configure automated backups
- [ ] Set up monitoring/alerts
- [ ] Implement rate limiting
- [ ] Add authentication middleware
- [ ] Use connection pooling (done)
- [ ] Add request validation
- [ ] Set up CI/CD pipeline
- [ ] Document API thoroughly

---

**Backend Setup Complete!** 🎉

Start building your School ERP system now:

```bash
npm start
```

Then test the endpoints:

```bash
curl http://localhost:5000/api/health
```
