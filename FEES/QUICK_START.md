# Quick Start - Student Data Collection

## 🚀 Get Started in 5 Minutes

### Step 1: Run Setup Script (Windows)
```powershell
cd backend
.\setup.ps1
```

This will automatically:
- Install dependencies
- Generate Prisma Client
- Create .env file if needed
- Start PostgreSQL (Docker)
- Run database migrations

### Step 2: Start the Server
```bash
npm run dev
```

Server will run on `http://localhost:5000`

### Step 3: Test Student Data Collection
In another terminal:
```bash
npm run test:student-data
```

This script will:
- ✓ Verify database connection
- ✓ Create a test student with all information
- ✓ Verify data is stored in PostgreSQL
- ✓ Retrieve data via API
- ✓ Show total student count
- ✓ Clean up test data

## 📊 Student Information Stored

When you create a student, ALL this information is saved to the database:

| Category | Fields |
|----------|--------|
| **Identity** | Student ID, First Name, Last Name |
| **Contact** | Email, Phone Number |
| **Personal** | Date of Birth, Gender |
| **Address** | Street, City, State, Postal Code, Country |
| **Enrollment** | Course, Class, Enrollment Date, Status |
| **System** | Created Date, Updated Date, Verified Status |

## 🔌 API Endpoints

### Create Student
```bash
POST /api/students
```

### Get Student by ID
```bash
GET /api/students/:id
```

### Update Student
```bash
PUT /api/students/:id
```

### Search/List Students
```bash
GET /api/students/search
```

### Get Statistics
```bash
GET /api/students/stats
```

### Bulk Upload (CSV)
```bash
POST /api/students/bulk-upload
```

## 💾 View Your Data

### Option 1: Prisma Studio (Visual)
```bash
npm run prisma:studio
```
Opens browser at http://localhost:5555

### Option 2: PostgreSQL Client
```bash
# Connect to database
psql -h localhost -U postgres -d fee_management

# View all students
SELECT * FROM "Student";
```

### Option 3: API Call
```bash
curl http://localhost:5000/api/students/search \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📝 Example: Create Student

```bash
# Get authentication token first
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' | jq -r '.data.accessToken')

# Create student with all information
curl -X POST http://localhost:5000/api/students \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "STU001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "dateOfBirth": "2005-05-15",
    "gender": "Male",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "USA",
    "courseId": "COURSE-UUID",
    "classId": "CLASS-UUID"
  }'
```

## 🐳 Docker Containers

Check if PostgreSQL is running:
```bash
docker ps | grep postgres
```

Restart if needed:
```bash
docker-compose down
docker-compose up -d
```

## 📚 Full Documentation

- **Setup Guide**: `STUDENT_DATA_SETUP_GUIDE.md`
- **API Testing**: `API_TESTING_GUIDE.md`
- **Backend Structure**: `backend/` directory

## ✅ Success Indicators

When everything is working:
- ✓ Server starts without errors
- ✓ `npm run test:student-data` passes all tests
- ✓ Students appear in Prisma Studio
- ✓ Database shows student records
- ✓ API returns student data

## 🔧 Troubleshooting

**"Cannot connect to database"**
```bash
# Check if Docker is running
docker ps

# Start PostgreSQL
docker-compose up -d
```

**"Prisma Client error"**
```bash
npm install
npm run prisma:generate
```

**"Port already in use"**
```bash
# Change port in .env
PORT=5001
```

**"No students showing"**
```bash
# Run migrations
npm run prisma:migrate

# Check database
npm run prisma:studio
```

## 🎯 Next Steps

1. ✅ Run setup script
2. ✅ Start server
3. ✅ Run verification test
4. ✅ Create first student via API
5. ✅ View in database
6. ✅ Connect frontend to API
7. ✅ Start collecting real student data

---

**Questions?** Check the detailed guides or review the database schema in `backend/prisma/schema.prisma`
