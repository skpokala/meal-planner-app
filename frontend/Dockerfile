# Build stage
FROM node:18-alpine AS build

# Accept build arguments
ARG REACT_APP_API_URL
ARG REACT_APP_VERSION

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Set environment variables for build
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV REACT_APP_VERSION=${REACT_APP_VERSION}

# Build the application (completely skip tests)
RUN npm run build:skip-tests

# Production stage
FROM nginx:alpine

# Remove default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built app from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose port
EXPOSE 3000

# Use custom entrypoint for runtime configuration
ENTRYPOINT ["/entrypoint.sh"] 