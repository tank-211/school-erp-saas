# Backend Setup Guide - ERP Fee Management System

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (Local or Cloud - MongoDB Atlas)
- npm or yarn package manager
- Git

## Step 1: Install Dependencies

```bash
cd backend
npm install
```

## Step 2: Configure Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```env
# Server
NODE_ENV=development
PORT=5000
HOST=localhost

# MongoDB
MONGODB_URI=mongodb://localhost:27017/fee-management
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/fee-management

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_in_production
JWT_REFRESH_EXPIRE=30d

# CORS
FRONTEND_URL=http://localhost:5173
ADMIN_FRONTEND_URL=http://localhost:3000

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

## Step 3: Set Up MongoDB

### Option A: Local MongoDB

```bash
# Start MongoDB service
# On Windows:
net start MongoDB

# On macOS:
brew services start mongodb-community

# On Linux:
sudo systemctl start mongod
```

### Option B: MongoDB Atlas (Cloud)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string
4. Update `MONGODB_URI` in `.env`

## Step 4: Start the Server

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

## Step 5: Verify Server is Running

Visit `http://localhost:5000/health` in your browser or Postman. You should see:

```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-03-29T10:30:00.000Z"
}
```

## Project Structure

```
backend/
├── config/              # Configuration files
│   ├── database.js      # MongoDB connection
│   ├── encryption.js    # Password hashing
│   ├── jwt.js          # JWT token generation
│   └── logger.js       # Winston logger
├── controllers/         # Request handlers
├── middleware/          # Custom middleware
│   ├── auth.js         # Authentication & authorization
│   ├── errorHandler.js # Error handling
│   ├── validation.js   # Request validation
│   └── requestLogger.js# Request logging
├── models/              # Mongoose schemas
├── routes/              # API routes
├── services/            # Business logic
├── utils/               # Helper functions
├── validators/          # Joi validation schemas
├── logs/                # Log files
├── .env                 # Environment variables
├── .env.example         # Example env file
├── server.js            # Entry point
└── package.json         # Dependencies
```

## Environment Variables Explanation

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | `development` |
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/fee-management` |
| `JWT_SECRET` | Secret key for JWT tokens | `strong_secret_key` |
| `JWT_EXPIRE` | Token expiration time | `7d` (7 days) |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:5173` |

## Available Scripts

```bash
# Development with auto-reload
npm run dev

# Production run
npm start

# Install dependencies
npm install

# Remove node_modules and reinstall
npm ci
```

## Database Models

The system includes these primary models:
- **User** - Admin, accountant, staff accounts
- **Student** - Student information
- **Course** - Course details
- **Class** - Class information
- **FeeType** - Types of fees (tuition, lab, etc.)
- **FeeStructure** - Fee structure per course/class
- **FeePayment** - Payment tracking
- **RefundRequest** - Refund management

## API Base URL

```
http://localhost:5000/api
```

## Accessing Logs

Logs are stored in `./logs/` directory:
- `app.log` - All logs
- `error.log` - Error logs only

## Troubleshooting

### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** Ensure MongoDB is running (`mongod` command)

### Port Already in Use
```
Error: listen EADDRINUSE :::5000
```
**Solution:** Change `PORT` in `.env` or kill process on port 5000

### JWT Token Error
```
Error: Invalid or expired token
```
**Solution:** Check `JWT_SECRET` is consistent, tokens expire after `JWT_EXPIRE` time

### Module Not Found
```
Error: Cannot find module 'express'
```
**Solution:** Run `npm install` to install dependencies

## Next Steps

1. [Read API Documentation](./API_ENDPOINTS.md)
2. [Understand Database Schema](./DATABASE_SCHEMA.md)
3. [Integration with Frontend](./INTEGRATION_GUIDE.md)
4. [Architecture Overview](./ARCHITECTURE.md)

## Support

For issues or questions, check logs in `./logs/` directory for detailed error messages.
