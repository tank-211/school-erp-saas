# Lead CRM Backend API

Production-ready Lead CRM Backend built with Node.js, Express, Prisma, and SQLite.

## Features

✅ JWT Authentication  
✅ Zod Validation  
✅ Prisma ORM with SQLite  
✅ MVC Architecture  
✅ Comprehensive Error Handling  
✅ Role-based Access Control  
✅ Dashboard & Analytics  
✅ Activity Tracking  
✅ Communication Logging  

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database
```bash
npx prisma migrate dev --name init
```

### 3. Start Development
```bash
npm run dev
```

## Environment Variables

Create `.env` file:
```env
NODE_ENV=development
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
BCRYPT_ROUNDS=10
```

## API Response Format

```json
{
  "success": true/false,
  "data": {},
  "message": "optional"
}
```

## Available Scripts

```bash
npm run dev              # Start development server
npm run start            # Start production server
npm run migrate          # Create migration
npm run migrate:prod     # Deploy migrations
npm run generate         # Generate Prisma client
npm run seed             # Seed database
```

## API Endpoints

### Authentication (5)
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
PUT    /api/auth/profile
POST   /api/auth/change-password
```

### Leads (6)
```
POST   /api/leads
GET    /api/leads
GET    /api/leads/:id
PUT    /api/leads/:id
DELETE /api/leads/:id
POST   /api/leads/bulk
```

### Activities (5)
```
POST   /api/activities
GET    /api/activities?leadId=
PUT    /api/activities/:id
DELETE /api/activities/:id
GET    /api/activities/recent
```

### Communications (5)
```
POST   /api/communication/email
POST   /api/communication/call
GET    /api/communication/history/:leadId
PUT    /api/communication/:id
DELETE /api/communication/:id
```

### Dashboard (6)
```
GET    /api/dashboard
GET    /api/dashboard/stats
GET    /api/dashboard/metrics
GET    /api/dashboard/enrollment-trend
GET    /api/dashboard/status-distribution
GET    /api/dashboard/today-overview
```

### Settings (3)
```
GET    /api/settings
PUT    /api/settings
GET    /api/settings/:category
```

### Health (1)
```
GET    /api/health
```

## Project Structure

```
src/
├── controllers/        # HTTP handlers
├── routes/             # Express routes
├── services/           # Business logic
├── middlewares/        # Auth, validation, errors
└── utils/              # Helpers
prisma/
├── schema.prisma       # Database schema
└── seed.js             # Test data
.env                    # Configuration
package.json            # Dependencies
README.md               # This file
```

## Testing with cURL

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","password":"pass123"}'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"pass123"}'
```

### Create Lead
```bash
curl -X POST http://localhost:5000/api/leads \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Corp","email":"contact@acme.com"}'
```

## License

MIT
