# ERP Fee Management System - Backend

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18%2B-blue)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0%2B-green)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-ISC-blue)](LICENSE)

A scalable, production-ready backend for an enterprise ERP Fee Management System built with Express.js and MongoDB.

## 🎯 Features

✅ **Complete Fee Management**
- Student fee payment tracking
- Multiple payment methods (Cash, Cheque, Online, Bank Transfer)
- Automatic overdue calculation with penalty

✅ **Refund Management**
- Refund request workflow (pending → approved → processed)
- Multiple refund methods (Bank Transfer, Cheque, Cash)
- Admin approval workflow

✅ **Authentication & Authorization**
- JWT-based authentication
- Role-based access control (Admin, Accountant, Staff)
- Refreshable tokens with security

✅ **Student Management**
- Complete student information system
- Address and parent details
- Bulk upload capability (CSV/Excel)
- Search with multiple filters

✅ **Analytics & Reports**
- Dashboard statistics (collected, pending, overdue)
- Monthly collection data
- Payment method distribution
- Refund statistics

✅ **Developer-Friendly**
- Clean MVC architecture
- Comprehensive error handling
- Request/response logging with Winston
- Input validation with Joi
- Detailed API documentation

## 📋 Prerequisites

- **Node.js** v18 or higher
- **MongoDB** v4.4 or higher (Local or MongoDB Atlas)
- **npm** or **yarn**

## 🚀 Quick Start

### 1. Clone & Install
```bash
cd backend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start MongoDB
```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas connection string in .env
```

### 4. Run Server
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

**✅ Server running at:** `http://localhost:5000`

**✅ API Health Check:** `http://localhost:5000/health`

## 📁 Project Structure

```
backend/
├── config/              # Configuration & setup
│   ├── database.js      # MongoDB connection
│   ├── encryption.js    # Password hashing
│   ├── jwt.js          # JWT token utilities
│   └── logger.js       # Winston logging
├── controllers/         # Request handlers
│   ├── authController.js
│   ├── studentController.js
│   ├── feePaymentController.js
│   └── refundController.js
├── middleware/          # Custom middleware
│   ├── auth.js         # Authentication & authorization
│   ├── errorHandler.js # Error handling
│   ├── validation.js   # Request validation
│   └── requestLogger.js  # Request logging
├── models/              # Mongoose schemas
│   ├── User.js
│   ├── Student.js
│   ├── Course.js
│   ├── Class.js
│   ├── FeeType.js
│   ├── FeeStructure.js
│   ├── FeePayment.js
│   └── RefundRequest.js
├── routes/              # API routes
│   ├── authRoutes.js
│   ├── studentRoutes.js
│   ├── feePaymentRoutes.js
│   └── refundRoutes.js
├── services/            # Business logic
│   ├── authService.js
│   ├── studentService.js
│   ├── feePaymentService.js
│   └── refundService.js
├── utils/               # Helper functions
│   ├── feeCalculations.js
│   ├── fileParser.js
│   └── responseHelper.js
├── validators/          # Joi validation schemas
│   ├── authValidator.js
│   ├── studentValidator.js
│   ├── feePaymentValidator.js
│   └── refundValidator.js
├── logs/                # Application logs
├── .env                 # Environment variables
├── server.js            # Entry point
└── package.json         # Dependencies
```

## 📡 API Endpoints

### Authentication
```
POST   /api/auth/register        - Register user
POST   /api/auth/login           - Login user
POST   /api/auth/refresh-token   - Refresh access token
POST   /api/auth/logout          - Logout user
```

### Students
```
POST   /api/students               - Create student (Admin/Accountant)
GET    /api/students/:id           - Get student details
PUT    /api/students/:id           - Update student (Admin/Accountant)
DELETE /api/students/:id           - Delete student (Admin)
GET    /api/students/search        - Search students with filters
POST   /api/students/bulk-upload   - Bulk upload students (Admin)
```

### Fee Payments
```
POST   /api/fee-payments                    - Create fee payment
POST   /api/fee-payments/:id/record-payment - Record payment
GET    /api/fee-payments/pending            - Get pending payments
GET    /api/fee-payments/overdue            - Get overdue payments
GET    /api/fee-payments/dashboard/stats    - Dashboard stats
GET    /api/fee-payments/dashboard/monthly  - Monthly collection data
```

### Refunds
```
POST   /api/refunds              - Create refund request
GET    /api/refunds              - Get refund requests
POST   /api/refunds/:id/approve  - Approve refund (Admin/Accountant)
POST   /api/refunds/:id/reject   - Reject refund (Admin/Accountant)
POST   /api/refunds/:id/process  - Process refund (Admin)
GET    /api/refunds/stats        - Refund statistics
```

**See [API_ENDPOINTS.md](./API_ENDPOINTS.md) for complete documentation**

## 🔐 Authentication

### JWT Token Structure
```
Header:  { alg: "HS256", typ: "JWT" }
Payload: { userId, role, iat, exp }
Signature: HMAC-SHA256
```

### How to Use
1. **Login** → Get `accessToken` and `refreshToken`
2. **API Requests** → Include: `Authorization: Bearer <accessToken>`
3. **Token Expired** → Use `refreshToken` to get new access token
4. **Logout** → Tokens are revoked

### Request Example
```bash
curl -X GET http://localhost:5000/api/students/search \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiI..."
```

## 🛡️ Role-Based Access Control

| Feature | Admin | Accountant | Staff |
|---------|:-----:|:----------:|:-----:|
| Create Student | ✓ | ✓ | ✗ |
| Bulk Upload | ✓ | ✗ | ✗ |
| Record Payment | ✓ | ✓ | ✗ |
| Dashboard Stats | ✓ | ✓ | ✗ |
| Approve Refund | ✓ | ✓ | ✗ |
| Process Refund | ✓ | ✗ | ✗ |
| View Reports | ✓ | ✓ | ✗ |

## 📊 Database Models

- **User** - Admin, accountant, staff accounts
- **Student** - Student information with address & parents
- **Course** - Course details (BCS, BBA, etc.)
- **Class** - Class/section information
- **FeeType** - Types of fees (Tuition, Lab, Library, etc.)
- **FeeStructure** - Fee structure per course/class
- **FeePayment** - Payment tracking with multiple transactions
- **RefundRequest** - Refund management with approval workflow

**See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for detailed schema**

## 🔧 Environment Variables

```env
# Server
NODE_ENV=development
PORT=5000
HOST=localhost

# Database
MONGODB_URI=mongodb://localhost:27017/fee-management

# JWT
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_REFRESH_EXPIRE=30d

# CORS
FRONTEND_URL=http://localhost:5173
ADMIN_FRONTEND_URL=http://localhost:3000

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

**See [.env.example](./.env.example) for complete list**

## 📚 Documentation

- [Setup Guide](./SETUP_GUIDE.md) - Installation and configuration
- [API Endpoints](./API_ENDPOINTS.md) - Complete API documentation
- [Database Schema](./DATABASE_SCHEMA.md) - Data models and relationships
- [Integration Guide](./INTEGRATION_GUIDE.md) - Frontend integration
- [Docker Setup](./DOCKER_SETUP.md) - Docker deployment
- [Backend Documentation](./BACKEND_DOCUMENTATION.md) - Architecture & patterns

## 🐳 Docker Deployment

### Quick Start with Docker Compose
```bash
docker-compose up -d

# Backend will run on: http://localhost:5000
# MongoDB will run on: localhost:27017
```

**See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for detailed instructions**

## 📝 Sample API Calls

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

### Create Student
```bash
curl -X POST http://localhost:5000/api/students \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "STU001",
    "firstName": "John",
    "lastName": "Doe",
    "course": "COURSE_ID",
    "class": "CLASS_ID"
  }'
```

### Record Payment
```bash
curl -X POST http://localhost:5000/api/fee-payments/PAYMENT_ID/record-payment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "paymentMethod": "online",
    "transactionId": "TXN123456"
  }'
```

## 🔐 Security Features

✅ Password hashing with bcryptjs
✅ JWT token-based authentication
✅ Role-based authorization
✅ Request validation with Joi
✅ CORS protection
✅ Rate limiting ready
✅ Helmet-ready for production
✅ Input sanitization
✅ Error handling without data leakage

## 🐛 Error Handling

Standard error response format:
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Email already exists"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 📊 Logging

Logs are stored in `./logs/`:
- `app.log` - All application logs
- `error.log` - Error logs only

View logs in real-time:
```bash
tail -f logs/app.log
```

## 🧪 Testing (Ready for Implementation)

```bash
# Run tests
npm test

# With coverage
npm run test:coverage
```

## 📈 Performance Optimization

- Database indexing on frequently queried fields
- Pagination for list endpoints
- Connection pooling
- Aggregation pipeline for complex queries
- Caching strategies implemented in services

## 🚀 Production Deployment

### Checklist
- [ ] Update `.env` with production values
- [ ] Set `NODE_ENV=production`
- [ ] Configure strong `JWT_SECRET`
- [ ] Set up HTTPS/SSL
- [ ] Configure production MongoDB URI
- [ ] Update CORS origins
- [ ] Set up monitoring and alerts
- [ ] Configure email service
- [ ] Set up database backups
- [ ] Use PM2 or similar for process management

### Using PM2
```bash
npm install -g pm2
pm2 start server.js --name "fee-management-api"
pm2 save
pm2 startup
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

This project is licensed under the ISC License - see [LICENSE](LICENSE) file

## 🆘 Support

For issues and questions:
1. Check logs in `./logs/app.log`
2. Review [troubleshooting section](./SETUP_GUIDE.md#troubleshooting)
3. Check API documentation
4. Create an issue with detailed information

## 🗺️ Roadmap

- [ ] Email notifications
- [ ] SMS notifications
- [ ] Payment gateway integration (Stripe, Razorpay)
- [ ] Invoice generation
- [ ] Advanced reporting
- [ ] Student portal
- [ ] Analytics dashboard
- [ ] API rate limiting
- [ ] Webhook support

## 👨‍💻 Authors

Created as part of ERP Fee Management System project

## 📞 Contact

For questions and support, please reach out through:
- Email: support@feemanagementsystem.com
- Documentation: See [BACKEND_DOCUMENTATION.md](./BACKEND_DOCUMENTATION.md)

---

**Ready to get started?** → [Setup Guide](./SETUP_GUIDE.md)

**Need API details?** → [API Endpoints](./API_ENDPOINTS.md)

**Integrating frontend?** → [Integration Guide](./INTEGRATION_GUIDE.md)
