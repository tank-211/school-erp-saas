# Deployment Guide

## Pre-Deployment Checklist

### Security
- [ ] Update JWT_SECRET to strong random string
- [ ] Increase BCRYPT_ROUNDS to 12+
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS for frontend URL
- [ ] Setup rate limiting

### Database
- [ ] Switch from SQLite to PostgreSQL
- [ ] Configure connection pooling
- [ ] Setup automated backups
- [ ] Test disaster recovery

### Code
- [ ] Run full test suite
- [ ] Remove debug logs
- [ ] Verify error messages
- [ ] Enable logging

---

## Database Migration: SQLite → PostgreSQL

### 1. Install PostgreSQL Driver
```bash
npm install pg
```

### 2. Update Prisma Schema
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 3. Update .env
```env
DATABASE_URL="postgresql://user:password@localhost:5432/leadcrm"
```

### 4. Run Migrations
```bash
npx prisma migrate deploy
npx prisma generate
```

---

## Deployment Options

### Option 1: VPS (DigitalOcean, Linode, AWS EC2)

#### Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Setup Project
```bash
cd /var/www
git clone <repo> lead-crm-api
cd lead-crm-api
npm install
```

#### Setup PM2
```bash
npm install -g pm2
pm2 start src/index.js --name "lead-crm-api"
pm2 startup
pm2 save
```

#### Setup Nginx
```nginx
upstream lead_api {
  server localhost:5000;
}

server {
  listen 80;
  server_name api.leadcrm.com;

  location / {
    proxy_pass http://lead_api;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

#### Enable SSL
```bash
sudo apt-get install certbot
sudo certbot certonly --standalone -d api.leadcrm.com
```

---

### Option 2: Docker

#### Dockerfile
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate

EXPOSE 5000

CMD ["node", "src/index.js"]
```

#### Docker Compose
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: postgresql://user:pass@postgres:5432/db
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### Deploy
```bash
docker-compose up -d
```

---

### Option 3: Heroku

#### Procfile
```
web: node src/index.js
release: npx prisma migrate deploy
```

#### Deploy
```bash
npm install -g heroku
heroku login
heroku create lead-crm-api
git push heroku main
```

---

## Environment Configuration

### Development
```env
NODE_ENV=development
DATABASE_URL="file:./dev.db"
JWT_SECRET=dev-secret
BCRYPT_ROUNDS=10
```

### Production
```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=<strong-random-key>
BCRYPT_ROUNDS=12
```

---

## Monitoring

### Application Performance
- Setup APM (Datadog, New Relic)
- Monitor response times
- Track error rates

### Logging
- Winston or ELK Stack
- CloudWatch or Datadog
- Alert on errors

### Database
- Query performance monitoring
- Connection pool monitoring
- Slow query logs

---

## Backup Strategy

### Automated Backups
```bash
# backup.sh
pg_dump -U postgres leadcrm > backup_$(date +%Y%m%d).sql
gzip backup_*.sql
aws s3 cp backup_*.sql.gz s3://backups/
```

### Schedule
```bash
# crontab: Daily at 2 AM
0 2 * * * /home/ubuntu/backup.sh
```

---

## Scaling

### Horizontal
- Load balancer (Nginx, AWS ELB)
- Multiple instances
- Database read replicas

### Vertical
- Increase instance size
- More database resources
- Larger memory/CPU

---

## Monitoring Checklist

### Daily
- Error logs
- API response times
- Database health

### Weekly
- Performance metrics
- User activity
- Backup integrity

### Monthly
- Capacity planning
- Dependency updates
- Slow query optimization

---

## Production Runbook

### Service Down
1. Check logs: `pm2 logs lead-crm-api`
2. Restart: `pm2 restart lead-crm-api`
3. Check DB: `psql -U postgres -d leadcrm`

### High CPU
1. Identify process: `top`
2. Check slow queries
3. Optimize indexes

### Disk Space Low
1. Check: `df -h`
2. Cleanup logs
3. Scale instance

---

## Rollback Procedure

### Database
```bash
npx prisma migrate resolve --rolled-back migration_name
npx prisma migrate deploy
```

### Application
```bash
git revert HEAD
npm install
npm run build
pm2 restart lead-crm-api
```

