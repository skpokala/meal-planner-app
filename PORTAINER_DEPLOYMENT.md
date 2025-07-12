# Meal Planner App - Portainer Deployment Guide

## 🚀 Quick Deployment in Portainer

### Step 1: Access Portainer
1. Open your Portainer instance (usually at `http://your-server:9000`)
2. Login with your admin credentials
3. Select your Docker environment

### Step 2: Create Stack
1. Navigate to **Stacks** in the left sidebar
2. Click **"+ Add stack"**
3. Enter stack name: `meal-planner-app`

### Step 3: Configure Environment Variables
Before pasting the compose file, set up these environment variables in the **Environment variables** section:

| Variable | Value | Description |
|----------|-------|-------------|
| `JWT_SECRET` | `your-secure-jwt-secret-32-chars-min` | **Required** - JWT signing secret |
| `MONGO_ROOT_USER` | `admin` | MongoDB admin username |
| `MONGO_ROOT_PASSWORD` | `your-secure-mongo-password` | MongoDB admin password |
| `MONGO_EXPRESS_USER` | `admin` | Mongo Express UI username |
| `MONGO_EXPRESS_PASSWORD` | `your-ui-password` | Mongo Express UI password |

### Step 4: Paste Docker Compose Configuration

Copy and paste this Docker Compose configuration into the **Web editor**:

```yaml
version: '3.8'

services:
  meal-planner-frontend:
    image: ghcr.io/skpokala/meal-planner-app-frontend:latest
    container_name: meal-planner-frontend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REACT_APP_API_URL=http://localhost:5000
    depends_on:
      meal-planner-backend:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.meal-planner-frontend.rule=Host(`meal-planner.local`)"
      - "traefik.http.services.meal-planner-frontend.loadbalancer.server.port=3000"
    networks:
      - meal-planner-network

  meal-planner-backend:
    image: ghcr.io/skpokala/meal-planner-app-backend:latest
    container_name: meal-planner-backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://${MONGO_ROOT_USER:-admin}:${MONGO_ROOT_PASSWORD:-password123}@meal-planner-mongo:27017/meal_planner?authSource=admin
      - JWT_SECRET=${JWT_SECRET:-meal-planner-jwt-secret-change-this-in-production}
      - PORT=5000
      - FRONTEND_URL=http://YOUR_SERVER_IP:3000
    depends_on:
      meal-planner-mongo:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.meal-planner-backend.rule=Host(`meal-planner-api.local`)"
      - "traefik.http.services.meal-planner-backend.loadbalancer.server.port=5000"
    networks:
      - meal-planner-network

  meal-planner-mongo:
    image: mongo:7.0
    container_name: meal-planner-mongo
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_DATABASE=meal-planner
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_ROOT_USER:-admin}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD:-password123}
    volumes:
      - meal-planner-mongo-data:/data/db
      - meal-planner-mongo-config:/data/configdb
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    command: ["mongod", "--bind_ip_all"]
    labels:
      - "traefik.enable=false"
    networks:
      - meal-planner-network

  # Optional: MongoDB Express for database management
  meal-planner-mongo-express:
    image: mongo-express:latest
    container_name: meal-planner-mongo-express
    ports:
      - "8081:8081"
    environment:
      - ME_CONFIG_MONGODB_SERVER=meal-planner-mongo
      - ME_CONFIG_MONGODB_PORT=27017
      - ME_CONFIG_MONGODB_ADMINUSERNAME=${MONGO_ROOT_USER:-admin}
      - ME_CONFIG_MONGODB_ADMINPASSWORD=${MONGO_ROOT_PASSWORD:-password123}
      - ME_CONFIG_BASICAUTH_USERNAME=${MONGO_EXPRESS_USER:-admin}
      - ME_CONFIG_BASICAUTH_PASSWORD=${MONGO_EXPRESS_PASSWORD:-admin123}
    depends_on:
      meal-planner-mongo:
        condition: service_healthy
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.meal-planner-mongo-express.rule=Host(`meal-planner-db.local`)"
      - "traefik.http.services.meal-planner-mongo-express.loadbalancer.server.port=8081"
    networks:
      - meal-planner-network

volumes:
  meal-planner-mongo-data:
    driver: local
    labels:
      - "backup.enable=true"
      - "backup.schedule=0 2 * * *"
  meal-planner-mongo-config:
    driver: local

networks:
  meal-planner-network:
    driver: bridge
    name: meal-planner-network
    labels:
      - "app=meal-planner"
```

### Step 5: Deploy Stack
1. Click **"Deploy the stack"**
2. Wait for all services to start (this may take a few minutes)
3. Check the logs if any service fails to start

## 🔧 Post-Deployment Configuration

### Access Points
After successful deployment, you can access:

- **Meal Planner App**: http://your-server:3000
- **API Health Check**: http://your-server:5000/health
- **MongoDB Express** (optional): http://your-server:8081

### Default Credentials
- **App Login**: Username: `admin`, Password: `password` (change after first login)
- **MongoDB Express**: Username: `admin`, Password: `admin123` (or your custom password)

## 📊 Monitoring in Portainer

### Health Checks
All services include health checks that you can monitor in Portainer:

1. Go to **Containers** in Portainer
2. Look for the health status indicators:
   - 🟢 **Healthy** - Service is running properly
   - 🟡 **Starting** - Service is starting up
   - 🔴 **Unhealthy** - Service has issues

### Logs
To view logs for troubleshooting:

1. Click on any container name
2. Go to **Logs** tab
3. Enable **Auto-refresh** for real-time monitoring

## 🔒 Security Considerations

### Required Security Updates
**⚠️ Important**: Change these default values before production use:

1. **JWT Secret**: Set a strong 32+ character secret
2. **MongoDB Passwords**: Use strong, unique passwords
3. **App Admin Password**: Change after first login

### Recommended Security Settings
```yaml
# Add these to your environment variables
JWT_SECRET: "your-very-secure-jwt-secret-at-least-32-characters-long"
MONGO_ROOT_PASSWORD: "your-secure-mongo-password-with-special-chars"
MONGO_EXPRESS_PASSWORD: "your-secure-ui-password"
```

## 🔄 Updates and Maintenance

### Updating the Application
1. In Portainer, go to **Stacks** → **meal-planner-app**
2. Click **Editor**
3. Change image tags from `:latest` to specific versions if needed
4. Click **Update the stack**

### Backing Up Data
The MongoDB data is stored in Docker volumes. To backup:

1. Go to **Volumes** in Portainer
2. Find `meal-planner-mongo-data`
3. Use Portainer's backup features or create manual backups

### Scaling Services
To scale the backend for higher load:

1. Edit the stack
2. Add `deploy.replicas: 3` under the backend service
3. Set up a load balancer (Traefik labels are included)

## 🚨 Troubleshooting

### Common Issues

#### **LOGIN FAILS - CORS/Network Issues (MOST COMMON)**

**Symptoms:**
- Login form appears but fails when submitting credentials
- Browser console shows CORS errors
- Network errors when trying to reach API

**Root Cause:**
The default configuration uses `localhost` URLs which don't work in containerized deployments.

**Fix:**
1. **Replace YOUR_SERVER_IP in the stack configuration**
   ```yaml
   # In your Portainer stack, replace:
   - REACT_APP_API_URL=http://YOUR_SERVER_IP:5000/api
   - FRONTEND_URL=http://YOUR_SERVER_IP:3000
   
   # With your actual server IP, for example:
   - REACT_APP_API_URL=http://192.168.1.100:5000/api
   - FRONTEND_URL=http://192.168.1.100:3000
   ```

2. **Alternative: Use environment variables in Portainer**
   - Go to your stack in Portainer
   - Click "Editor" 
   - In the "Environment variables" section, add:
     ```
     SERVER_IP=192.168.1.100
     ```
   - Then update your stack configuration to use:
     ```yaml
     environment:
       - REACT_APP_API_URL=http://${SERVER_IP}:5000/api
       - FRONTEND_URL=http://${SERVER_IP}:3000
     ```

3. **Update the stack**
   - Click "Update the stack"
   - Wait for containers to restart

**Default Login Credentials:**
- **Username**: `admin`
- **Password**: `password`

#### **How to Find Your Server IP**
```bash
# On your server, run:
ip addr show | grep inet

# Or for external IP:
curl ifconfig.me
```

#### Services Won't Start
1. Check **Logs** for error messages
2. Verify environment variables are set correctly
3. Ensure ports 3000, 5000, 8081, and 27017 are available

#### Can't Access the App
1. Check if containers are healthy
2. Verify firewall settings allow access to ports
3. Check Docker network connectivity
4. **Ensure you're using the correct server IP address**

#### Database Connection Issues

**Error**: `MongoServerError: Command find requires authentication`

**Root Cause**: MongoDB is configured with authentication but the connection string doesn't include credentials.

**Fix**: Update your MongoDB URI to include authentication:
```yaml
# Wrong (missing auth):
- MONGODB_URI=mongodb://meal-planner-mongo:27017/meal_planner

# Correct (with auth):
- MONGODB_URI=mongodb://${MONGO_ROOT_USER:-admin}:${MONGO_ROOT_PASSWORD:-password123}@meal-planner-mongo:27017/meal_planner?authSource=admin
```

**Other checks:**
1. Verify MongoDB container is healthy
2. Check MongoDB logs for authentication errors
3. Ensure `MONGO_ROOT_PASSWORD` matches between services

#### **Step-by-Step Login Fix**

1. **Access your Portainer instance**
2. **Navigate to Stacks → meal-planner-app**
3. **Click "Editor"**
4. **Replace all instances of `YOUR_SERVER_IP` with your actual server IP**
5. **Click "Update the stack"**
6. **Wait for services to restart (2-3 minutes)**
7. **Access the app at `http://YOUR_SERVER_IP:3000`**
8. **Login with:**
   - Username: `admin`
   - Password: `password`

### Getting Help
- Check container logs in Portainer
- Review health check status
- Verify environment variables are properly set
- **Most importantly: Ensure server IP addresses are correct**

### Production Security Checklist
After fixing the login issue, update these for production:
- [ ] Change JWT_SECRET to a strong random string
- [ ] Update MONGO_ROOT_PASSWORD
- [ ] Change admin password after first login
- [ ] Enable HTTPS if possible
- [ ] Update firewall rules as needed

## 📝 Advanced Configuration

### Custom Domains
If you have Traefik running, update the labels:
```yaml
labels:
  - "traefik.http.routers.meal-planner-frontend.rule=Host(`yourdomain.com`)"
```

### SSL/TLS
Add SSL configuration to Traefik labels:
```yaml
labels:
  - "traefik.http.routers.meal-planner-frontend.tls=true"
  - "traefik.http.routers.meal-planner-frontend.tls.certresolver=letsencrypt"
```

### Resource Limits
Add resource constraints:
```yaml
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
```

## 🎯 Production Checklist

Before going to production:

- [ ] Change all default passwords
- [ ] Set strong JWT secret
- [ ] Configure proper domain names
- [ ] Set up SSL/TLS certificates
- [ ] Configure backups
- [ ] Set up monitoring/alerting
- [ ] Test disaster recovery procedures
- [ ] Document access credentials securely

## 🆘 Support

For issues specific to this deployment:
- Check Portainer logs and container health
- Review environment variable configuration
- Verify network connectivity between services

For application issues:
- Visit: https://github.com/skpokala/meal-planner-app/issues 