# Manual Setup Instructions

Follow these steps to manually set up the backend:

## Step 1: Navigate to backend directory
```powershell
cd backend
```

## Step 2: Install dependencies
```powershell
npm install
```

## Step 3: Create .env file
Create a file named `.env` in the backend directory with this content:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fee_management?schema=public
NODE_ENV=development
PORT=5000
HOST=localhost
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
LOG_LEVEL=debug
MAX_FILE_SIZE=10485760
```

## Step 4: Start PostgreSQL with Docker
```powershell
docker-compose up -d
```

Wait 5 seconds for PostgreSQL to start, then verify:
```powershell
docker ps | findstr "fee-management-postgres"
```

## Step 5: Generate Prisma Client
```powershell
npm run prisma:generate
```

## Step 6: Run Prisma Migrations
```powershell
npm run prisma:migrate
```

## Step 7: Start the development server
```powershell
npm run dev
```

The server should start at http://localhost:5000

---

## If you encounter errors:

### Prisma Generation Error
If `prisma:generate` fails, try:
```powershell
rm -r node_modules/.prisma
npm run prisma:generate
```

### PostgreSQL Connection Error
Ensure Docker is running:
```powershell
docker-compose up -d
docker ps
```

### Port 5000 Already in Use
Edit `.env` and change:
```
PORT=5001
```

---

## Quick Verification

1. Check server is running:
   ```powershell
   curl http://localhost:5000/health
   ```

2. View database with Prisma Studio:
   ```powershell
   npm run prisma:studio
   ```

3. Test student data collection:
   ```powershell
   npm run test:student-data
   ```
