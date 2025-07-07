# Use Node.js base image
FROM node:18-alpine

# Accept build arguments
ARG REACT_APP_API_URL

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Set environment variable for build
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

# Build the application (completely skip tests)
RUN npm run build --production

# Install serve globally to serve the build
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Start serve with the build folder
CMD ["serve", "-s", "build", "-l", "3000"] 