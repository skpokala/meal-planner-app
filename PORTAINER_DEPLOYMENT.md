# Portainer Deployment Guide

## 🚀 Quick Fix for Common Issues

### Issue 1: "host not found in upstream" nginx error

If you're getting nginx errors like `host not found in upstream "meal-planner-backend"`, this means the service names in your Docker compose don't match the nginx configuration.

**Quick Fix:**
1. Ensure your Docker compose uses these exact service names:
   - `frontend` - for the frontend service
   - `meal-planner-backend` - for the backend service  
   - `meal-planner-mongo` - for the MongoDB service

2. Use the updated configuration files provided below

### Issue 2: CORS Errors

If you're getting "XMLHttpRequest cannot load due to access control checks" errors, follow these steps:

### Step 1: Update Environment Variables in Portainer

1. Go to your Portainer dashboard
2. Navigate to **Stacks** → **meal-planner-app** (or your stack name)
3. Click **Editor**
4. Update the environment variables:

```yaml
# Replace YOUR_SERVER_IP with your actual server IP address
# For example: 192.168.1.100 or your-domain.com

services:
  meal-planner-frontend:
    environment:
      - NODE_ENV=production
      - REACT_APP_API_URL=http://YOUR_ACTUAL_SERVER_IP:5000/api
      # ↑ Replace with your server's IP address

  meal-planner-backend:
    environment:
      - NODE_ENV=production
      - FRONTEND_URL=http://YOUR_ACTUAL_SERVER_IP:3000
      # ↑ Replace with your server's IP address
```

### Step 2: Deploy the Updated Stack

1. Click **Update the stack**
2. Wait for the containers to restart
3. Test the login functionality

## 📋 Complete Deployment Steps

### Option A: Using Docker Compose (Recommended)

1. **Download the Portainer-optimized compose file:**
   ```bash
   curl -o docker-compose.portainer.yml https://raw.githubusercontent.com/skpokala/meal-planner-app/main/docker-compose.portainer.yml
   ```

2. **Set your environment variables:**
   ```bash
   export HOST_IP="YOUR_SERVER_IP"  # Replace with your actual server IP
   export JWT_SECRET="your-secure-jwt-secret-here"
   ```

3. **Deploy the stack:**
   ```bash
   docker-compose -f docker-compose.portainer.yml up -d
   ```

### Option B: Using Portainer Stack

1. **Create a new stack in Portainer**
2. **Copy the following configuration:**

```yaml
version: '3.8'

services:
  frontend:
    image: ghcr.io/skpokala/meal-planner-app-frontend:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REACT_APP_API_URL=http://YOUR_SERVER_IP:5000/api
    depends_on:
      - meal-planner-backend
    restart: unless-stopped
    networks:
      - meal-planner-network

  meal-planner-backend:
    image: ghcr.io/skpokala/meal-planner-app-backend:latest
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://meal-planner-mongo:27017/meal-planner
      - JWT_SECRET=your-secure-jwt-secret-here
      - PORT=5000
      - FRONTEND_URL=http://YOUR_SERVER_IP:3000
    depends_on:
      - meal-planner-mongo
    restart: unless-stopped
    networks:
      - meal-planner-network

  meal-planner-mongo:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=meal-planner
    restart: unless-stopped
    networks:
      - meal-planner-network

volumes:
  mongo_data:
    driver: local

networks:
  meal-planner-network:
    driver: bridge
```

3. **Replace `YOUR_SERVER_IP` with your actual server IP**
4. **Change `your-secure-jwt-secret-here` to a secure secret**
5. **Deploy the stack**

## 🔧 Finding Your Server IP

### If deploying on a local network:
```bash
# On Linux/Mac
hostname -I | awk '{print $1}'

# On Windows
ipconfig | findstr IPv4
```

### If deploying on a cloud server:
- Use your cloud server's public IP address
- Or use your domain name if you have one configured

## 🌐 Accessing the Application

After deployment:
- **Frontend**: `http://YOUR_SERVER_IP:3000`
- **Backend API**: `http://YOUR_SERVER_IP:5000/api`
- **Health Check**: `http://YOUR_SERVER_IP:5000/api/health`

## 🔒 Security Considerations

1. **Change Default JWT Secret**: Always use a secure, random JWT secret
2. **Firewall Rules**: Consider limiting access to specific IPs
3. **HTTPS**: For production, set up SSL/TLS certificates
4. **MongoDB Security**: Add authentication if exposing MongoDB port

## 🛠️ Troubleshooting

### Common Issues and Solutions:

1. **"host not found in upstream" nginx error**:
   - This means your Docker compose service names don't match nginx configuration
   - Ensure you use these exact service names:
     - `frontend` (for the frontend service)
     - `meal-planner-backend` (for the backend service)
     - `meal-planner-mongo` (for the MongoDB service)
   - Use the updated configuration provided in this guide

2. **CORS Error**: 
   - Ensure `FRONTEND_URL` in backend matches your actual frontend URL
   - Check that `REACT_APP_API_URL` in frontend points to the correct backend URL

3. **Cannot connect to MongoDB**:
   - Ensure MongoDB container is running
   - Check MongoDB connection string in backend environment
   - Verify MongoDB service name is `meal-planner-mongo` in connection string

4. **Images not found**:
   - Ensure Portainer can access ghcr.io
   - Try pulling images manually: `docker pull ghcr.io/skpokala/meal-planner-app-frontend:latest`

### Health Check Commands:

```bash
# Check if containers are running
docker ps

# Check backend health
curl http://YOUR_SERVER_IP:5000/api/health

# Check frontend
curl http://YOUR_SERVER_IP:3000

# Check logs (container names may vary based on your stack name)
docker logs meal-planner-app-meal-planner-backend-1
docker logs meal-planner-app-frontend-1

# Or use Portainer's UI to view logs:
# Go to Containers → Click container name → Logs tab
```

## 🔄 Updating the Application

To update to the latest version:

1. In Portainer, go to your stack
2. Click **Editor**
3. Update image tags to `:latest` (or specific version)
4. Click **Update the stack**

Or via command line:
```bash
docker-compose -f docker-compose.portainer.yml pull
docker-compose -f docker-compose.portainer.yml up -d
```

## 📞 Support

If you continue having issues:
1. Check the [GitHub Issues](https://github.com/skpokala/meal-planner-app/issues)
2. Provide your Docker logs when reporting issues
3. Include your deployment configuration (with secrets redacted)

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Portainer Documentation](https://documentation.portainer.io/)
- [MongoDB in Docker](https://hub.docker.com/_/mongo) 