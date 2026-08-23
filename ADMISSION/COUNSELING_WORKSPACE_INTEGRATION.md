# Counseling Workspace Integration Checklist

## ✅ Files Created

### Backend Files

- ✅ `backend/db/queries/counselingQueries.js` - Database queries layer
- ✅ `backend/controllers/counselingController.js` - Business logic layer
- ✅ `backend/routes/counselingRoutes.js` - Express routes

### Frontend Files

- ✅ `Frontend_AA/src/services/CounselingService.js` - API client service

### Documentation Files

- ✅ `COUNSELING_WORKSPACE_IMPLEMENTATION.md` - Complete implementation guide

---

## 🔧 Integration Steps

### Step 1: Add Routes to Backend (Required)

**File**: `backend/app.js`

Locate your existing route imports and add:

```javascript
// Add this import with your other route imports
import counselingRoutes from "./routes/counselingRoutes.js";

// Then add this line to register the routes (after your other app.use routes)
// Example location: after other API routes like leadRoutes, applicationRoutes, etc.
app.use("/api", counselingRoutes);
```

**Alternative**: If you have a centralized route registration, add:

```javascript
app.use("/api/counseling", counselingRoutes);
```

### Step 2: Verify Database Tables

Ensure these tables exist in your database schema:

**Table: campus_visit**

```sql
-- Check if table exists
SELECT * FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'campus_visit';

-- If not, create it:
CREATE TABLE campus_visit (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES school(id),
  lead_id INTEGER REFERENCES lead(id),
  counselor_id INTEGER NOT NULL REFERENCES "user"(id),
  student_name VARCHAR(255) NOT NULL,
  grade VARCHAR(50) NOT NULL,
  visit_date DATE NOT NULL,
  visit_time TIME NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_counselor_slot UNIQUE (school_id, counselor_id, visit_date, visit_time)
    WHERE status NOT IN ('cancelled', 'no_show')
);
```

**Table: lead** (must already exist)

- Required columns: `id`, `school_id`, `first_name`, `last_name`, `phone`, `email`, `desired_class`, `assigned_to`

**Table: parent_detail** (must already exist)

- Required columns: `lead_id`, `parent_name`, `parent_phone`

**Table: task** (for dashboard stats - must already exist)

- Required columns: `id`, `school_id`, `assigned_to`, `status`

### Step 3: Create Database Indexes

Run these SQL commands to create performance indexes:

```sql
-- Index for dashboard queries (visit list and statistics)
CREATE INDEX IF NOT EXISTS idx_campus_visit_dashboard
ON campus_visit(school_id, counselor_id, visit_date)
WHERE status NOT IN ('cancelled', 'no_show');

-- Index for double-booking prevention
CREATE INDEX IF NOT EXISTS idx_campus_visit_slot
ON campus_visit(school_id, counselor_id, visit_date, visit_time)
WHERE status NOT IN ('cancelled', 'no_show');

-- Index for lead search
CREATE INDEX IF NOT EXISTS idx_lead_assigned
ON lead(school_id, assigned_to)
WHERE assigned_to IS NOT NULL;
```

### Step 4: Frontend Setup (Optional - if building UI components)

The `CounselingService.js` file is already created in:

```
Frontend_AA/src/services/CounselingService.js
```

This service handles all API communication. Use it in your React components:

```javascript
import CounselingService from "@/services/CounselingService";

// Example usage in a component
function CounselingDashboard() {
  const [stats, setStats] = React.useState(null);

  React.useEffect(() => {
    CounselingService.getDashboardStats()
      .then((res) => res.success && setStats(res.data))
      .catch((error) => console.error(error));
  }, []);

  return stats ? (
    <div>
      <h2>Counseling Dashboard</h2>
      <p>Assigned Leads: {stats.assignedLeads}</p>
      <p>Upcoming Visits: {stats.upcomingVisits}</p>
      <p>Pending Tasks: {stats.pendingTasks}</p>
    </div>
  ) : (
    <p>Loading...</p>
  );
}
```

---

## 📋 API Endpoints Available

Once integrated, the following endpoints will be available:

### Dashboard

- `GET /api/counseling/stats` - Get dashboard statistics

### Campus Visits

- `GET /api/counseling/visits` - Get all visits (optional: ?filterToday=true)
- `POST /api/campus-visits` - Create new visit
- `GET /api/campus-visits/:id` - Get single visit
- `PUT /api/campus-visits/:id` - Update visit
- `DELETE /api/campus-visits/:id` - Cancel visit

### Lead Search

- `GET /api/counseling/leads/search?q=search_term` - Search assigned leads

---

## ✅ Testing Checklist

### Backend Testing

**1. Start Server**

```bash
cd backend
npm start
```

**2. Test Dashboard Endpoint**

```bash
curl -X GET http://localhost:5001/api/counseling/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**3. Test Lead Search**

```bash
curl -X GET "http://localhost:5001/api/counseling/leads/search?q=john" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**4. Test Create Visit**

```bash
curl -X POST http://localhost:5001/api/campus-visits \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lead_id": 1,
    "student_name": "John Doe",
    "grade": "10th",
    "visit_date": "2025-03-15",
    "visit_time": "10:00",
    "notes": "Test visit"
  }'
```

### Frontend Testing

**1. In Browser Console**

```javascript
// Import the service
import CounselingService from "@/services/CounselingService";

// Test dashboard stats
await CounselingService.getDashboardStats();

// Test visit list
await CounselingService.getVisits();

// Test lead search
await CounselingService.searchLeads("john");
```

---

## 🚀 Deployment Checklist

- [ ] Added counselingRoutes import to backend/app.js
- [ ] Added app.use() for counselingRoutes in backend/app.js
- [ ] Verified campus_visit table exists in database
- [ ] Verified lead, parent_detail, and task tables exist
- [ ] Created required indexes in database
- [ ] Frontend CounselingService.js is properly located
- [ ] JWT token is available in localStorage during requests
- [ ] Tested API endpoints with Authorization header
- [ ] Tested frontend service methods work correctly
- [ ] Handled errors in UI components

---

## 📝 Common Integration Issues & Solutions

### Issue: "Cannot find module 'counselingRoutes'"

**Solution**: Verify the import path is correct:

```javascript
import counselingRoutes from "./routes/counselingRoutes.js";
```

### Issue: "Counseling endpoints not responding"

**Solution**:

1. Check routes are registered: `app.use('/api', counselingRoutes);`
2. Check server is running: `npm start`
3. Verify JWT token in Authorization header

### Issue: Database errors

**Solution**:

1. Verify tables exist: `SELECT * FROM campus_visit;`
2. Run migration/schema SQL if needed
3. Check database connection in app.js

### Issue: "CounselingService is not a module"

**Solution**: Ensure you're importing as singleton:

```javascript
import CounselingService from "@/services/CounselingService";
```

---

## 📚 Documentation Reference

For detailed documentation, see: [COUNSELING_WORKSPACE_IMPLEMENTATION.md](./COUNSELING_WORKSPACE_IMPLEMENTATION.md)

Key sections:

- Backend Components Overview
- API Endpoints Reference
- Usage Examples
- Error Handling Guide
- Constraints & Validations
- Performance Considerations
- Security Considerations

---

## 🔍 Quick Reference: File Locations

```
Backend:
├── backend/
│   ├── db/queries/
│   │   └── counselingQueries.js      (Database layer)
│   ├── controllers/
│   │   └── counselingController.js   (Business logic)
│   └── routes/
│       └── counselingRoutes.js       (Express routes)

Frontend:
└── Frontend_AA/src/services/
    └── CounselingService.js          (API client)
```

---

## 📞 Support

If you encounter issues:

1. Check the integration checklist above
2. Review the detailed documentation in COUNSELING_WORKSPACE_IMPLEMENTATION.md
3. Verify database table structure matches requirements
4. Check Authorization headers on API requests
5. Review console/server logs for error messages
