# Portainer Deployment Guide

## 🎉 **CORS Issue Resolved!**

The latest version automatically detects the correct API URL at runtime. You **no longer need to manually configure API URLs** - the frontend will automatically work with your server IP.

## 🚀 Quick Fix for Common Issues

### Issue 1: "XMLHttpRequest cannot load http://localhost:5000" - **FIXED!**

✅ **This is now automatically resolved!** The frontend uses smart runtime detection:
- Uses nginx proxy with relative URLs (`/api`) for containerized deployments
- Automatically detects your server's hostname 
- No manual configuration needed

### Issue 2: "host not found in upstream" nginx error

If you're getting nginx errors like `host not found in upstream "meal-planner-backend"`, ensure your Docker compose uses these exact service names:
- `frontend` - for the frontend service
- `meal-planner-backend` - for the backend service  
- `meal-planner-mongo` - for the MongoDB service

## 📋 Complete Deployment Steps

### Option A: Using Docker Compose (Recommended)

1. **Download the latest configuration:**
   ```bash
   curl -o docker-compose.portainer.yml https://raw.githubusercontent.com/skpokala/meal-planner-app/main/docker-compose.portainer.yml
   ```

2. **Set your JWT secret:**
   ```bash
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
      # API URL is automatically detected - no configuration needed!
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
      # Allow requests from any origin for containerized deployments
      - FRONTEND_URL=*
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

3. **Replace `your-secure-jwt-secret-here` with a secure secret**
4. **Deploy the stack**
5. **Access your app at** `http://YOUR_SERVER_IP:3000`

## 🌐 **That's It!** 

✅ **No IP configuration needed**  
✅ **No manual API URL setup**  
✅ **Works with any server IP automatically**  
✅ **CORS errors resolved**  

Just deploy and access your app at `http://YOUR_SERVER_IP:3000`

## 🔧 Advanced Configuration (Optional)

### Custom API URL Override
If you need to override the automatic detection:

```yaml
frontend:
  environment:
    - NODE_ENV=production
    - API_URL=http://custom-api-domain.com:5000/api
```

### External Database
```yaml
meal-planner-backend:
  environment:
    - MONGODB_URI=mongodb://external-mongo-server:27017/meal-planner
```

## 🛠️ Troubleshooting

### Common Issues and Solutions:

1. **"host not found in upstream" nginx error**:
   - Ensure you use these exact service names:
     - `frontend` (for the frontend service)
     - `meal-planner-backend` (for the backend service)
     - `meal-planner-mongo` (for the MongoDB service)

2. **Cannot connect to MongoDB**:
   - Ensure MongoDB container is running
   - Check MongoDB connection string in backend environment
   - Verify MongoDB service name is `meal-planner-mongo`

3. **Images not found**:
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

## 🔒 Security Considerations

1. **Change Default JWT Secret**: Always use a secure, random JWT secret
2. **Firewall Rules**: Consider limiting access to specific IPs
3. **HTTPS**: For production, set up SSL/TLS certificates
4. **Default Login**: Change the default admin password after first login

## 📞 Support

If you continue having issues:
1. Check the [GitHub Issues](https://github.com/skpokala/meal-planner-app/issues)
2. Provide your Docker logs when reporting issues
3. Include your deployment configuration (with secrets redacted)

## 🎯 Default Login Credentials

- **Username:** `admin`
- **Password:** `password`

**⚠️ Important: Change the default admin password after first login!**

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Portainer Documentation](https://documentation.portainer.io/)
- [MongoDB in Docker](https://hub.docker.com/_/mongo) 