FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use install instead of ci for flexibility)
RUN npm install

# Copy source code
COPY . .

# Build the production application
RUN CI=false npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production && npm cache clean --force

# Expose port
EXPOSE 3000

# Install serve for production serving
RUN npm install -g serve

# Start the application (serve the built files)
CMD ["serve", "-s", "build", "-l", "3000"] 