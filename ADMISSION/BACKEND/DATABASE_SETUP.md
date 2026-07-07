# PostgreSQL Database Setup Guide

## 📋 Prerequisites

- PostgreSQL 12+ installed and running
- Node.js 14+ installed
- npm or yarn package manager
- psql command-line tool (comes with PostgreSQL)

## 🚀 Quick Setup

### Step 1: Create PostgreSQL Database

Open your terminal and run:

```bash
# Connect to PostgreSQL as admin
psql -U postgres

# Create the database
CREATE DATABASE admission;

# Verify creation
\l

# Exit psql
\q
```

### Step 2: Run the SQL Schema

The schema file at `backend/database/schema.sql` contains all table definitions.

**Option A: Using psql**

```bash
psql -U postgres -d admission -f backend/database/schema.sql
```

**Option B: Copy-paste in pgAdmin**

1. Open pgAdmin
2. Create new database named `admission`
3. Open Query Tool
4. Copy contents of `backend/database/schema.sql`
5. Run the query

### Step 3: Verify Database Setup

```bash
# Connect to admission database
psql -U postgres -d admission

# List all tables
\dt

# View table details
\d school

# Check sample data
SELECT * FROM school;

# Exit
\q
```

## 🔧 Backend Setup

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Configure Environment Variables

```bash
# Copy .env.example to .env
cp .env.example .env

# OR create new .env file with:
cat > .env << EOF
NODE_ENV=development
PORT=5000
HOST=localhost

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=tanmay@123
DB_NAME=admission

DB_POOL_MIN=2
DB_POOL_MAX=10
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug
EOF
```

### Step 3: Start the Server

```bash
# Development mode (requires nodemon)
npm install -g nodemon
npm run dev

# OR regular start
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

## 📊 Database Connection Details

### Connection Pool Configuration

```javascript
// config/db.js
{
  host: 'localhost',           // Database server
  port: 5432,                  // PostgreSQL default port
  user: 'postgres',            // Default admin user
  password: 'tanmay@123',      // Your password
  database: 'admission',       // Database name
  min: 2,                      // Minimum connections
  max: 10,                     // Maximum connections
  idleTimeoutMillis: 30000,    // 30 seconds idle timeout
  connectionTimeoutMillis: 2000 // 2 seconds connection timeout
}
```

## 📚 Database Schema Overview

### Tables (in creation order)

1. **school** - Main tenant table
   - Stores school information
   - Primary key: id (BIGSERIAL)

2. **academic_year** - Academic periods
   - Stores year information (2024-25, etc.)
   - FK: school_id

3. **school_class** - Class definitions (Grade 1, Grade 2, etc.)
   - FK: school_id

4. **section** - Sections within classes (A, B, C)
   - FK: school_id, class_id

5. **student** - Student records
   - FK: school_id
   - UK: admission_number, email, aadhar_number

6. **parent_detail** - Parent/Guardian information
   - FK: school_id, student_id

7. **lead** - Prospective student leads
   - FK: school_id, academic_year_id

8. **admission** - Student admission records
   - FK: school_id, student_id, academic_year_id, class_id, section_id

9. **fee_structure** - Fee configuration by class
   - FK: school_id, academic_year_id, class_id

10. **student_fee_assignment** - Fee assignment to students
    - FK: school_id, student_id, admission_id, fee_structure_id

11. **invoice** - Fee invoices
    - FK: school_id, student_id

12. **payment** - Payment records
    - FK: school_id, student_id, invoice_id

### Key Relationships

```
school (1) ──→ (M) academic_year
school (1) ──→ (M) school_class
school (1) ──→ (M) section
school (1) ──→ (M) student
school (1) ──→ (M) lead
school (1) ──→ (M) admission
school (1) ──→ (M) fee_structure
school (1) ──→ (M) student_fee_assignment
school (1) ──→ (M) invoice
school (1) ──→ (M) payment

student (1) ──→ (M) admission
student (1) ──→ (M) parent_detail
student (1) ──→ (M) student_fee_assignment
student (1) ──→ (M) invoice
student (1) ──→ (M) payment

admission (1) ──→ (M) student_fee_assignment
academic_year (1) ──→ (M) admission
class (1) ──→ (M) section
class (1) ──→ (M) admission
class (1) ──→ (M) fee_structure
section (1) ──→ (M) admission
```

## 🔍 Common Database Operations

### Check Database Status

```sql
-- Check database size
SELECT datname, pg_size_pretty(pg_database_size(datname)) as size
FROM pg_database
WHERE datname = 'admission';

-- Check table row counts
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname != 'pg_catalog'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- List all indexes
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname != 'pg_catalog'
ORDER BY tablename;
```

### Reset Database

```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS admission;"
psql -U postgres -c "CREATE DATABASE admission;"

# Re-run schema
psql -U postgres -d admission -f backend/database/schema.sql
```

### Backup Database

```bash
# Backup database
pg_dump -U postgres -d admission > backup_admission.sql

# Restore database
psql -U postgres -d admission < backup_admission.sql
```

## 🔐 Security Notes

⚠️ **Important for Production:**

1. **Change default password** - Don't use 'tanmay@123' in production
2. **Use strong passwords** - Min 12 characters, mix of uppercase, lowercase, numbers, symbols
3. **Implement SSL** - Use SSL connection to database
4. **Firewall rules** - Restrict database access to app server only
5. **Connection pooling** - Already implemented in config/db.js
6. **Monitor queries** - Log slow queries
7. **Backups** - Regular automated backups
8. **Permissions** - Use least privilege principle for DB users

### Create Production User

```sql
-- Create new user with limited privileges
CREATE USER admission_user WITH PASSWORD 'strong_password_here';

-- Grant privileges
GRANT CONNECT ON DATABASE admission TO admission_user;
GRANT USAGE ON SCHEMA public TO admission_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO admission_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO admission_user;

-- Make it default for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO admission_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO admission_user;
```

## ✅ Verification Checklist

- [ ] PostgreSQL installed and running
- [ ] Database `admission` created
- [ ] Schema loaded from sql file
- [ ] Node.js and npm installed
- [ ] Backend dependencies installed (`npm install`)
- [ ] `.env` file created with correct credentials
- [ ] Database connection successful (check console logs)
- [ ] Server running on localhost:5000
- [ ] Health check endpoint works (GET /api/health)
- [ ] API endpoints responding with sample data

## 🆘 Troubleshooting

### "connection refused"

- Check PostgreSQL is running
- Verify correct host/port in .env
- Check credentials are correct

### "database does not exist"

- Verify database name in .env matches created database
- Run SQL schema script again

### "permission denied"

- Verify user has correct privileges
- Check password is correct

### "pool timeout"

- Increase `DB_POOL_MAX` in .env
- Check database performance
- Review slow queries

### Tables not found

- Verify schema.sql was executed completely
- Check for SQL errors in the output
- Try dropping and recreating database

## 📞 Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node-postgres Documentation](https://node-postgres.com/)
- [pgAdmin Web Interface](https://www.pgadmin.org/)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

**Setup completed successfully!** 🎉

You can now:

1. Run the backend server: `npm start`
2. Test API endpoints: `http://localhost:5000/api/health`
3. Manage database: pgAdmin or psql
