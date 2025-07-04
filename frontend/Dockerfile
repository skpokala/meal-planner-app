FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the production application
RUN CI=false npm run build

# Remove dev dependencies to reduce image size
RUN npm ci --only=production && npm cache clean --force

# Expose port
EXPOSE 3000

# Install serve for production serving
RUN npm install -g serve

# Start the application (serve the built files)
CMD ["serve", "-s", "build", "-l", "3000"] 