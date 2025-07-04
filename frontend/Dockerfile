FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Run tests (this will fail the build if tests fail)
RUN npm run test:ci

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"] 