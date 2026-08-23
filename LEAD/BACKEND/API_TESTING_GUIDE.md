# API Testing Guide - Step-by-Step

Complete guide for testing all 23 endpoints.

## Quick Start

```bash
npm install
npx prisma migrate dev --name init
npm run seed  # Optional: seed test data
npm run dev
```

## 1. Register User

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Save the token from response!**

---

## 2. Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

---

## 3. Get Current User

```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 4. Update Profile

```bash
curl -X PUT http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe"
  }'
```

---

## 5. Change Password

```bash
curl -X POST http://localhost:5000/api/auth/change-password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "password123",
    "newPassword": "newpassword456"
  }'
```

---

## 6. Create Lead

```bash
curl -X POST http://localhost:5000/api/leads \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Acme Corporation",
    "email": "contact@acme.com",
    "phone": "+1234567890",
    "status": "new",
    "source": "website"
  }'
```

**Save the lead ID!**

---

## 7. Get All Leads

```bash
curl -X GET "http://localhost:5000/api/leads?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 8. Get Lead by ID

```bash
curl -X GET http://localhost:5000/api/leads/LEAD_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 9. Update Lead

```bash
curl -X PUT http://localhost:5000/api/leads/LEAD_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "qualified"
  }'
```

---

## 10. Delete Lead

```bash
curl -X DELETE http://localhost:5000/api/leads/LEAD_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 11. Bulk Create Leads

```bash
curl -X POST http://localhost:5000/api/leads/bulk \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leads": [
      {
        "name": "Tech Startup",
        "email": "hello@techstartup.com"
      },
      {
        "name": "Global Solutions",
        "email": "info@globalsolutions.com"
      }
    ]
  }'
```

---

## 12. Create Activity

```bash
curl -X POST http://localhost:5000/api/activities \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "call",
    "note": "Discussed pricing",
    "leadId": "LEAD_ID"
  }'
```

---

## 13. Get Activities

```bash
curl -X GET "http://localhost:5000/api/activities?leadId=LEAD_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 14. Update Activity

```bash
curl -X PUT http://localhost:5000/api/activities/ACTIVITY_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "note": "Updated note"
  }'
```

---

## 15. Delete Activity

```bash
curl -X DELETE http://localhost:5000/api/activities/ACTIVITY_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 16. Send Email

```bash
curl -X POST http://localhost:5000/api/communication/email \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "contact@acme.com",
    "subject": "Project Proposal",
    "content": "Hi, here is our proposal...",
    "leadId": "LEAD_ID"
  }'
```

---

## 17. Log Call

```bash
curl -X POST http://localhost:5000/api/communication/call \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "LEAD_ID",
    "duration": 1200,
    "notes": "Discussed requirements"
  }'
```

---

## 18. Get Communication History

```bash
curl -X GET "http://localhost:5000/api/communication/history/LEAD_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 19. Get Dashboard

```bash
curl -X GET http://localhost:5000/api/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 20. Get Stats

```bash
curl -X GET http://localhost:5000/api/dashboard/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 21. Get Metrics

```bash
curl -X GET http://localhost:5000/api/dashboard/metrics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 22. Get Settings

```bash
curl -X GET http://localhost:5000/api/settings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 23. Update Settings

```bash
curl -X PUT http://localhost:5000/api/settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "email",
    "key": "smtp_host",
    "value": "smtp.gmail.com"
  }'
```

---

## Health Check

```bash
curl http://localhost:5000/api/health
```

---

## Common Errors

| Error | Solution |
|-------|----------|
| "No token provided" | Add `Authorization: Bearer TOKEN` header |
| "Invalid or expired token" | Get new token by logging in |
| "Validation failed" | Check request data against schema |
| "Lead not found" | Verify lead ID exists |

---

## Notes

- Replace `YOUR_TOKEN` with actual token from register/login
- Replace `LEAD_ID` with actual lead ID
- Replace `ACTIVITY_ID` with actual activity ID
- All endpoints except `/api/auth/register`, `/api/auth/login`, and `/api/health` require authentication
