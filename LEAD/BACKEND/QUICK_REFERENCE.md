# Quick Reference Guide

## ⚡ 5-Minute Setup

```bash
npm install
npx prisma migrate dev --name init
npm run dev
```

Visit: http://localhost:5000/api/health

---

## 🔑 Core Commands

```bash
npm run dev              # Start dev server
npm run start            # Start production
npm run migrate          # Create migration
npm run generate         # Generate Prisma client
npm run seed             # Load test data
```

---

## 📍 Key Directories

| Path | Purpose |
|------|---------|
| src/controllers | HTTP handlers |
| src/routes | API endpoints |
| src/services | Business logic |
| src/middlewares | Auth & validation |
| src/utils | Helpers |
| prisma/ | Database schema |

---

## 🔐 Authentication

### Get Token
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"User","email":"user@example.com","password":"pass"}'
```

### Use Token
```bash
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/auth/me
```

---

## 🔄 Database Models

```
User       id, email, password, name, role
Lead       id, name, email, phone, status, source
Activity   id, type, note, leadId, userId
Communication id, type, content, status, leadId, userId
Settings   id, category, key, value
```

---

## 📋 API Quick Reference

### Auth
```
POST   /api/auth/register      # Create account
POST   /api/auth/login         # Login
GET    /api/auth/me            # Profile
PUT    /api/auth/profile       # Update profile
POST   /api/auth/change-password
```

### Leads
```
POST   /api/leads              # Create
GET    /api/leads              # List
GET    /api/leads/:id          # Get one
PUT    /api/leads/:id          # Update
DELETE /api/leads/:id          # Delete
POST   /api/leads/bulk         # Import many
```

### Activities
```
POST   /api/activities         # Create
GET    /api/activities         # List
PUT    /api/activities/:id     # Update
DELETE /api/activities/:id     # Delete
GET    /api/activities/recent  # Recent
```

### Communications
```
POST   /api/communication/email     # Send email
POST   /api/communication/call      # Log call
GET    /api/communication/history/:leadId
PUT    /api/communication/:id
DELETE /api/communication/:id
```

### Dashboard
```
GET    /api/dashboard          # Full dashboard
GET    /api/dashboard/stats    # Metrics
GET    /api/dashboard/metrics  # Activity counts
GET    /api/dashboard/enrollment-trend
GET    /api/dashboard/status-distribution
GET    /api/dashboard/today-overview
```

### Settings
```
GET    /api/settings           # All
PUT    /api/settings           # Update
GET    /api/settings/:category # By category
```

---

## ✅ Response Format

```json
{
  "success": true,
  "data": { "id": "123", "name": "Lead" },
  "message": "Lead created"
}
```

---

## 🛡️ Validation Rules

```
Email       RFC 5322 format
Password    Min 6 chars
Phone       Numeric + symbols
Status      new|qualified|lost|converted
Source      website|referral|cold_call|email|other
```

---

## 📊 Query Parameters

```
page=1              # Page number (default: 1)
limit=10            # Items per page (default: 10)
status=qualified    # Filter by status
source=website      # Filter by source
search=Acme         # Search name/email/phone
myLeads=true        # My leads only
type=call           # Activity type
category=email      # Settings category
days=30             # Trend days
```

---

## 🚀 Deployment

### Environment Variables
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://...
JWT_SECRET=strong-secret-key
BCRYPT_ROUNDS=12
```

### Deploy with PM2
```bash
npm install -g pm2
pm2 start src/index.js --name "lead-crm"
pm2 startup
pm2 save
```

### Deploy with Docker
```bash
docker build -t lead-crm .
docker run -p 5000:5000 lead-crm
```

---

## 🐛 Debug Tips

### View Logs
```bash
npm run dev              # Console output
pm2 logs lead-crm       # PM2 logs
tail -f debug.log       # Log file
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "No token" | Add Authorization header |
| "Invalid token" | Get new token |
| "Validation failed" | Check request data |
| "Port in use" | Change PORT in .env |
| "DB connection error" | Check DATABASE_URL |

---

## 🧪 Test Examples

### Create Lead
```bash
curl -X POST http://localhost:5000/api/leads \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme","email":"contact@acme.com"}'
```

### Filter Leads
```bash
curl "http://localhost:5000/api/leads?status=qualified&limit=5" \
  -H "Authorization: Bearer TOKEN"
```

### Send Email
```bash
curl -X POST http://localhost:5000/api/communication/email \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to":"contact@acme.com",
    "subject":"Hi",
    "content":"Message",
    "leadId":"id"
  }'
```

---

## 📈 Common Queries

### All My Leads
```
GET /api/leads?myLeads=true&limit=50
```

### New Leads This Month
```
GET /api/leads?status=new&page=1&limit=10
```

### Recent Activities
```
GET /api/activities/recent?limit=10
```

### Lead Conversion Rate
```
GET /api/dashboard/stats
```

### Sales Trends
```
GET /api/dashboard/enrollment-trend?days=30
```

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| README.md | Setup & overview |
| API_TESTING_GUIDE.md | 23 test cases |
| ARCHITECTURE.md | Design & patterns |
| DEPLOYMENT.md | Production setup |
| PROJECT_SUMMARY.md | Full overview |
| QUICK_REFERENCE.md | This file |

---

## 🔗 File Locations

All code in: `src/`  
Database schema: `prisma/schema.prisma`  
Config: `.env`, `package.json`  
Entry point: `src/index.js`  

---

## ⚙️ Environment Variables

```env
NODE_ENV=development|production
PORT=5000                           # Server port
DATABASE_URL=file:./dev.db          # Dev: SQLite
DDATABASE_URL=postgresql://...      # Prod: PostgreSQL
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
BCRYPT_ROUNDS=10
```

---

## 🎯 Key Features

✅ JWT authentication  
✅ Lead management  
✅ Activity tracking  
✅ Communication logs  
✅ Dashboard analytics  
✅ Settings management  
✅ Bulk imports  
✅ Pagination  
✅ Filtering & search  
✅ Error handling  

---

## 📞 API Status Codes

```
200  Success
201  Created
400  Bad request
401  Unauthorized
404  Not found
500  Server error
```

---

## ✨ Pro Tips

1. Use `GET /api/health` to check if server is running
2. Store token in browser localStorage or secure cookie
3. Use pagination for large datasets
4. Combine filters for powerful queries
5. Auto-create activities via communication endpoints
6. Monitor logs for errors
7. Use .env.example as template

---

**Happy coding! 🚀**
