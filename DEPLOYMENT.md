# Meal Planner App - Docker Deployment Guide

## Overview

The Meal Planner App is available as Docker images on GitHub Container Registry (GHCR) for easy deployment. This guide covers various deployment options from simple single-server setups to production-ready configurations.

## 🚀 Quick Start

### Prerequisites

- Docker Engine 20.10+ and Docker Compose 2.0+
- At least 2GB RAM and 10GB disk space
- Network access to pull images from ghcr.io

### One-Command Deployment

```bash
# Set your JWT secret (required for security)
export JWT_SECRET="your-secure-jwt-secret-$(openssl rand -hex 32)"

# Download and start the application
curl -O https://raw.githubusercontent.com/skpokala/meal-planner-app/main/docker-compose.prod.yml
docker-compose -f docker-compose.prod.yml up -d
```

🎉 **That's it!** The app will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## 📦 Available Images

The following images are published to GitHub Container Registry:

- **Frontend**: `ghcr.io/skpokala/meal-planner-app-frontend:latest`
- **Backend**: `ghcr.io/skpokala/meal-planner-app-backend:latest`

### Image Tags

- `latest`: Latest stable version from main branch
- `v1.0.0`, `v1.1.0`, etc.: Semantic version releases
- `main-<sha>`: Development builds from main branch

## 🐳 Deployment Options

### Option 1: Docker Compose (Recommended)

Best for most use cases - includes all services with proper networking and persistence.

```bash
# Create a deployment directory
mkdir meal-planner-app && cd meal-planner-app

# Download the production compose file
curl -O https://raw.githubusercontent.com/skpokala/meal-planner-app/main/docker-compose.prod.yml

# Set environment variables
export JWT_SECRET="your-secure-jwt-secret-here"

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Option 2: Individual Containers

For custom networking or advanced configurations:

```bash
# Create network
docker network create meal-planner-network

# Start MongoDB
docker run -d --name meal-planner-mongo \
  --network meal-planner-network \
  -p 27017:27017 \
  -v meal-planner-mongo:/data/db \
  mongo:7.0

# Start Backend
docker run -d --name meal-planner-backend \
  --network meal-planner-network \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -e MONGODB_URI=mongodb://meal-planner-mongo:27017/meal-planner \
  -e JWT_SECRET=your-jwt-secret-here \
  ghcr.io/skpokala/meal-planner-app-backend:latest

# Start Frontend
docker run -d --name meal-planner-frontend \
  --network meal-planner-network \
  -p 3000:3000 \
  -e NODE_ENV=production \
  ghcr.io/skpokala/meal-planner-app-frontend:latest
```

### Option 3: Kubernetes (Advanced)

For production Kubernetes deployments, see the [Kubernetes deployment guide](./k8s/).

## ⚙️ Configuration

### Environment Variables

#### Backend Configuration
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Runtime environment | `production` | Yes |
| `MONGODB_URI` | MongoDB connection string | `mongodb://mongo:27017/meal-planner` | Yes |
| `JWT_SECRET` | JWT signing secret | - | **Yes** |
| `PORT` | Server port | `5000` | No |

#### Frontend Configuration
| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Runtime environment | `production` | Yes |
| `REACT_APP_API_URL` | Backend API URL | `http://localhost:5000` | No |

### Security Configuration

#### JWT Secret
**⚠️ Critical**: Always set a strong JWT secret in production:

```bash
# Generate a secure JWT secret
export JWT_SECRET="$(openssl rand -hex 32)"

# Or use a custom secret (minimum 32 characters)
export JWT_SECRET="your-very-secure-secret-key-here"
```

#### Default Credentials
- **Username**: `admin`
- **Password**: `password`

**🔒 Important**: Change the default admin password immediately after first login!

## 🏥 Health Checks & Monitoring

### Health Check Endpoints

- **Backend**: `GET /health` - Returns service status
- **Frontend**: `GET /` - Returns React application

### Monitoring with Docker Compose

```bash
# Check service health
docker-compose -f docker-compose.prod.yml ps

# View real-time logs
docker-compose -f docker-compose.prod.yml logs -f

# Monitor resource usage
docker stats
```

### Health Check Commands

```bash
# Backend health
curl -f http://localhost:5000/health

# Frontend health  
curl -f http://localhost:3000

# Database health
docker exec meal-planner-mongo mongosh --eval "db.adminCommand('ping')"
```

## 💾 Data Persistence

### MongoDB Data

Data is persisted in Docker volumes:

```bash
# List volumes
docker volume ls

# Backup MongoDB data
docker exec meal-planner-mongo mongodump --out /data/backup
docker cp meal-planner-mongo:/data/backup ./mongodb-backup-$(date +%Y%m%d)

# Restore MongoDB data
docker cp ./mongodb-backup meal-planner-mongo:/data/restore
docker exec meal-planner-mongo mongorestore /data/restore
```

### Volume Management

```bash
# Create explicit volumes for better control
docker volume create meal-planner-mongo-data

# Use in compose file
volumes:
  mongo_data:
    external: true
    name: meal-planner-mongo-data
```

## 🔄 Updates & Maintenance

### Updating to Latest Version

```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Restart with new images
docker-compose -f docker-compose.prod.yml up -d

# Clean up old images
docker image prune -f
```

### Rollback to Previous Version

```bash
# Use specific version
sed -i 's/:latest/:v1.0.0/g' docker-compose.prod.yml
docker-compose -f docker-compose.prod.yml up -d
```

### Backup Before Updates

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="./backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup MongoDB
docker exec meal-planner-mongo mongodump --out /data/backup
docker cp meal-planner-mongo:/data/backup "$BACKUP_DIR/mongodb"

# Backup compose file
cp docker-compose.prod.yml "$BACKUP_DIR/"

echo "Backup created in $BACKUP_DIR"
EOF

chmod +x backup.sh
./backup.sh
```

## 🚨 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
lsof -i :3000
lsof -i :5000

# Use different ports
sed -i 's/3000:3000/3001:3000/g' docker-compose.prod.yml
```

#### Permission Denied
```bash
# Fix Docker permissions
sudo usermod -aG docker $USER
newgrp docker
```

#### Database Connection Issues
```bash
# Check MongoDB logs
docker logs meal-planner-mongo

# Verify network connectivity
docker exec meal-planner-backend ping meal-planner-mongo
```

#### Frontend Not Loading
```bash
# Check nginx logs
docker logs meal-planner-frontend

# Verify API connectivity
curl http://localhost:5000/health
```

### Debug Mode

```bash
# Enable debug logging
docker-compose -f docker-compose.prod.yml up -d --env-file debug.env

# debug.env file:
NODE_ENV=development
DEBUG=*
```

## 🌐 Production Deployment

### Reverse Proxy Setup (nginx)

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL/TLS with Let's Encrypt

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall Configuration

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Restrict MongoDB (if needed externally)
sudo ufw allow from trusted-ip to any port 27017
```

## 📊 Performance Optimization

### Resource Limits

```yaml
# In docker-compose.prod.yml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Scaling

```bash
# Scale backend service
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Load balancer configuration needed for multiple backends
```

## 🆘 Support

- **Issues**: https://github.com/skpokala/meal-planner-app/issues
- **Documentation**: https://github.com/skpokala/meal-planner-app/wiki
- **Discussions**: https://github.com/skpokala/meal-planner-app/discussions

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 