FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy ML service code
COPY . .

# Create directories for models and data
RUN mkdir -p models data

# Set environment variables
ENV PYTHONPATH=/app
ENV FLASK_APP=api_server.py
ENV ML_SERVICE_PORT=5003
ENV ML_SERVICE_HOST=0.0.0.0

# Expose port
EXPOSE 5003

# Create non-root user
RUN addgroup --gid 1001 --system ml && \
    adduser --no-create-home --shell /bin/false --disabled-password --uid 1001 --system --group ml

# Change ownership
RUN chown -R ml:ml /app

# Switch to non-root user
USER ml

# Command to run the application
CMD ["python", "api_server.py"] 