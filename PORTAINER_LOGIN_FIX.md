# 🔥 URGENT: Portainer Login Fix

## Problem
Your Portainer hosted meal planner app is failing at login due to CORS and network configuration issues.

## Quick Fix (5 minutes)

### Step 1: Find Your Server IP
On your server, run:
```bash
ip addr show | grep inet
```
Look for your server's IP address (e.g., `192.168.1.100`)

### Step 2: Update Portainer Stack
1. **Access Portainer** (usually `http://your-server:9000`)
2. **Go to Stacks → meal-planner-app**
3. **Click "Editor"**
4. **Replace BOTH instances of `YOUR_SERVER_IP` with your actual server IP**:
   ```yaml
   # Find these lines and replace YOUR_SERVER_IP:
   - REACT_APP_API_URL=http://YOUR_SERVER_IP:5000/api
   - FRONTEND_URL=http://YOUR_SERVER_IP:3000
   
   # Example (replace with your actual IP):
   - REACT_APP_API_URL=http://192.168.1.100:5000/api
   - FRONTEND_URL=http://192.168.1.100:3000
   ```

### Step 3: Deploy
1. **Click "Update the stack"**
2. **Wait 2-3 minutes for containers to restart**

### Step 4: Test Login
1. **Access the app**: `http://YOUR_SERVER_IP:3000`
2. **Login with**:
   - Username: `admin`
   - Password: `password`

## Root Cause
The default configuration uses `localhost` URLs which don't work in containerized deployments. The frontend can't communicate with the backend because:
- CORS policy blocks cross-origin requests
- Network routing fails between containers

## If Still Not Working

### MongoDB Authentication Error
**Error**: `MongoServerError: Command find requires authentication`

**Fix**: Your MongoDB connection string is missing authentication credentials.

1. **In Portainer, update your stack to include credentials in the MongoDB URI**:
   ```yaml
   # Replace this line:
   - MONGODB_URI=mongodb://meal-planner-mongo:27017/meal_planner
   
   # With this line:
   - MONGODB_URI=mongodb://${MONGO_ROOT_USER:-admin}:${MONGO_ROOT_PASSWORD:-password123}@meal-planner-mongo:27017/meal_planner?authSource=admin
   ```

2. **Update the stack**
3. **Wait for containers to restart**

### Check Container Logs
In Portainer:
1. Go to **Containers**
2. Click on `meal-planner-backend`
3. Go to **Logs** tab
4. Look for CORS, connection, or authentication errors

### Verify Health Status
Check that all containers show as "healthy" (green) in Portainer.

### Browser Console
Open browser developer tools (F12) and check for:
- CORS errors
- Network timeout errors
- 404 errors

## Alternative: Use Environment Variables
Instead of hardcoding the IP, you can use environment variables:

1. In Portainer stack editor, go to **Environment variables** section
2. Add: `SERVER_IP=192.168.1.100` (your actual IP)
3. Update the stack configuration to use:
   ```yaml
   environment:
     - REACT_APP_API_URL=http://${SERVER_IP}:5000/api
     - FRONTEND_URL=http://${SERVER_IP}:3000
   ```

## Next Steps (Security)
After login works, change these defaults:
- Admin password (`password` is insecure)
- JWT_SECRET environment variable
- MongoDB passwords

## Need Help?
Check the container logs and verify your server IP address is correct and accessible from your browser. 