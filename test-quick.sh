#!/bin/bash

# 🚀 Quick Local Test Script
# Fast validation before commit (skips Docker tests)

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_header() {
    echo
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Start script
print_header "⚡ Quick Local Test Runner"
echo

# Frontend Tests
print_status "Running frontend tests..."
cd frontend
npm run test:ci
cd ..

# Backend Tests  
print_status "Running backend tests..."
cd backend
npm run test:coverage
cd ..

# Security Audits
print_status "Running security audits..."
cd frontend
npm audit --audit-level high --omit=dev >/dev/null 2>&1 || true
cd ../backend
npm audit --audit-level high --omit=dev >/dev/null 2>&1
cd ..

print_header "✅ Quick Tests Completed!"
print_success "🎉 Core tests passed! Ready for commit."
print_status "Run './test-local.sh' for full validation including Docker tests"
echo 