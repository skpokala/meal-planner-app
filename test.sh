#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧪 Running Meal Planner App Tests${NC}"
echo "========================================"

# Function to check if command was successful
check_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1 passed${NC}"
    else
        echo -e "${RED}❌ $1 failed${NC}"
        exit 1
    fi
}

# Check if we should run tests with Docker or locally
if [ "$1" = "--docker" ]; then
    echo -e "${YELLOW}🐳 Running tests with Docker...${NC}"
    
    echo "Building and running test containers..."
    docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
    check_result "Docker tests"
    
    echo "Cleaning up test containers..."
    docker-compose -f docker-compose.test.yml down
    
elif [ "$1" = "--ci" ]; then
    echo -e "${YELLOW}🤖 Running tests in CI mode...${NC}"
    
    # Frontend tests
    echo "Running frontend tests..."
    cd frontend
    npm run test:ci
    check_result "Frontend tests"
    cd ..
    
    # Backend tests
    echo "Running backend tests..."
    cd backend
    npm run test:ci
    check_result "Backend tests"
    cd ..
    
else
    echo -e "${YELLOW}💻 Running tests locally...${NC}"
    
    # Check if node_modules exist
    if [ ! -d "frontend/node_modules" ]; then
        echo "Installing frontend dependencies..."
        cd frontend && npm install && cd ..
    fi
    
    if [ ! -d "backend/node_modules" ]; then
        echo "Installing backend dependencies..."
        cd backend && npm install && cd ..
    fi
    
    # Frontend tests
    echo "Running frontend tests with coverage..."
    cd frontend
    npm run test:coverage
    check_result "Frontend tests"
    cd ..
    
    # Backend tests
    echo "Running backend tests with coverage..."
    cd backend
    npm run test:coverage
    check_result "Backend tests"
    cd ..
    
    echo -e "${GREEN}📊 Coverage reports generated:${NC}"
    echo "  Frontend: frontend/coverage/lcov-report/index.html"
    echo "  Backend: backend/coverage/lcov-report/index.html"
fi

echo -e "${GREEN}🎉 All tests completed successfully!${NC}" 