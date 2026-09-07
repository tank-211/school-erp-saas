# Dockerfile - ERP Fee Management System Backend

## Multi-stage Build for Production

```dockerfile
# Stage 1: Build stage (if needed)
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

# Stage 2: Runtime
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to run node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
```

## Docker Compose Setup

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: fee-management-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
      MONGO_INITDB_DATABASE: fee-management
    volumes:
      - mongodb_data:/data/db
      - ./init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js:ro
    networks:
      - fee-network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost/test --quiet
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: .
    container_name: fee-management-backend
    restart: unless-stopped
    ports:
      - "5000:5000"
    depends_on:
      mongodb:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 5000
      HOST: 0.0.0.0
      MONGODB_URI: mongodb://admin:password@mongodb:27017/fee-management?authSource=admin
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRE: 7d
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      JWT_REFRESH_EXPIRE: 30d
      FRONTEND_URL: http://localhost:5173
      ADMIN_FRONTEND_URL: http://localhost:3000
      LOG_LEVEL: info
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    networks:
      - fee-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    image: node:18-alpine
    container_name: fee-management-frontend
    working_dir: /app
    restart: unless-stopped
    ports:
      - "5173:5173"
    volumes:
      - ../:/app
    command: sh -c "npm install && npm run dev"
    networks:
      - fee-network
    depends_on:
      - backend

volumes:
  mongodb_data:

networks:
  fee-network:
    driver: bridge
```

## .dockerignore

```
node_modules
npm-debug.log
.git
.gitignore
.env
.env.local
.DS_Store
logs/
uploads/
dist/
build/
.vscode
.idea
README.md
```

## .env.docker

```env
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

MONGODB_URI=mongodb://admin:password@mongodb:27017/fee-management?authSource=admin
MONGODB_USER=admin
MONGODB_PASSWORD=password

JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_refresh_secret_key_change_this
JWT_REFRESH_EXPIRE=30d

FRONTEND_URL=http://localhost:5173
ADMIN_FRONTEND_URL=http://localhost:3000

MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads

LOG_LEVEL=info
LOG_FILE=./logs/app.log

RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

## Building and Running with Docker

### Prerequisites
- Docker installed
- Docker Compose installed

### Step 1: Set up environment variables
```bash
cp .env.docker .env.docker.local
# Edit .env.docker.local with your values
```

### Step 2: Build the image
```bash
docker build -t fee-management-backend:latest .
```

### Step 3: Run with Docker Compose
```bash
docker-compose up -d
```

### Step 4: Verify services are running
```bash
docker-compose ps

# Should show:
# fee-management-mongodb    Running
# fee-management-backend    Running
# fee-management-frontend   Running
```

### Step 5: Check logs
```bash
docker-compose logs -f backend
```

## Useful Docker Commands

```bash
# View logs
docker-compose logs backend
docker-compose logs -f backend  # Follow logs

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Rebuild images
docker-compose build --no-cache

# Execute command in container
docker-compose exec backend npm test

# Access MongoDB shell
docker-compose exec mongodb mongosh --username admin --password password --authenticationDatabase admin

# View service status
docker-compose ps

# View resource usage
docker stats

# Restart services
docker-compose restart backend
```

## Production Deployment (AWS/Digital Ocean)

### Using Docker on EC2
```bash
# Connect to EC2 instance
ssh -i key.pem ubuntu@your-ec2-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone repository
git clone your-repo
cd backend

# Create .env file with production values
nano .env

# Run services
docker-compose -f docker-compose.prod.yml up -d

# Set up SSL with Let's Encrypt
# (Additional configuration needed)
```

## Troubleshooting Docker

### Service won't start
```
ERROR: Service 'backend' failed to build

Solution: 
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### MongoDB connection error
```
Error: connect ECONNREFUSED mongodb:27017

Solution: Make sure MongoDB service is healthy
docker-compose exec mongodb mongosh --username admin --password password
```

### Port already in use
```
docker container ls
docker stop <container-id>
# Or change ports in docker-compose.yml
```

### View MongoDB logs
```bash
docker-compose logs mongodb
```

### Access MongoDB from container
```bash
docker-compose exec mongodb mongosh --username admin --password password --authenticationDatabase admin
```

---

**Note:** Always use strong secrets in production. Never commit `.env` files to git.
