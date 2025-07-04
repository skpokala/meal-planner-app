# 🍽️ Family Meal Planner

A comprehensive meal planning application for families to organize, plan, and manage their weekly meals.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Docker & Docker Compose
- npm

### Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd meal-planner-app

# Install all dependencies
npm run install:all
```

### Development
```bash
# Start frontend development server
npm run dev:frontend

# Start backend development server  
npm run dev:backend

# Start full application with Docker
npm run dev:docker
```

## 🧪 Testing

### Quick Testing (before commit)
```bash
# Run core tests quickly
npm test
# or
./test-quick.sh
```

### Full Testing (complete GitHub Actions simulation)
```bash
# Run all tests including Docker
npm run test:full
# or  
./test-local.sh
```

### Individual Test Commands
```bash
# Frontend tests only
npm run test:frontend

# Backend tests only
npm run test:backend

# Security audits only
npm run test:security

# Docker build tests
npm run docker:test
```

## 📦 Building

### Production Build
```bash
# Build frontend for production
npm run build

# Build Docker images
npm run docker:build
```

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Quick test suite (frontend + backend + security) |
| `npm run test:full` | Complete test suite including Docker |
| `npm run test:frontend` | Frontend tests only |
| `npm run test:backend` | Backend tests with coverage |
| `npm run test:security` | Security audit for both services |
| `npm run build` | Production build |
| `npm run docker:build` | Build Docker images |
| `npm run docker:test` | Run Docker test suite |
| `npm run docker:clean` | Clean up Docker containers |
| `npm run install:all` | Install all dependencies |
| `npm run dev:frontend` | Start frontend dev server |
| `npm run dev:backend` | Start backend dev server |
| `npm run dev:docker` | Start with Docker Compose |
| `npm run precommit` | Pre-commit validation |

## 🛠️ Local Testing Workflow

### Before Every Commit
```bash
# Quick validation (recommended)
npm test

# Full validation (thorough)
npm run test:full
```

### Test Scripts

#### `./test-quick.sh` - Fast Pre-commit Check
- ✅ Frontend tests (6 tests)
- ✅ Backend tests (11 tests) 
- ✅ Security audits
- ⏱️ ~30 seconds

#### `./test-local.sh` - Complete GitHub Actions Simulation
- ✅ Frontend tests + build
- ✅ Backend tests + coverage
- ✅ Security audits
- ✅ Docker production builds
- ✅ Docker test execution
- ⏱️ ~3-5 minutes

## 🏗️ Architecture

### Frontend
- **React 18** with modern hooks
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API communication
- **Jest + Testing Library** for testing

### Backend
- **Node.js + Express** REST API
- **MongoDB** with Mongoose ODM
- **JWT** authentication
- **bcryptjs** password hashing
- **Helmet + CORS** security middleware
- **Jest + Supertest** for testing

### DevOps
- **Docker** containerization
- **GitHub Actions** CI/CD
- **MongoDB Memory Server** for testing
- **Comprehensive security auditing**

## 🔒 Security

- 🛡️ **Production Dependencies**: 0 vulnerabilities
- 🔐 **Authentication**: JWT with secure password hashing
- 🚫 **Rate Limiting**: API protection against abuse
- 🛡️ **Security Headers**: Helmet.js implementation
- 🔍 **Automated Auditing**: CI/CD security validation

## 📊 Test Coverage

- **Frontend**: 6/6 tests passing
- **Backend**: 11/11 tests passing  
- **Security**: 0 production vulnerabilities
- **Docker**: Production + test builds validated

## 🚀 Deployment

The application is configured for deployment with:
- Production-optimized Docker images
- Environment-based configuration
- Health checks and monitoring
- Automated CI/CD pipeline

## 🤝 Contributing

1. Run tests before committing: `npm test`
2. Use conventional commit messages
3. Ensure all GitHub Actions checks pass
4. Full validation: `npm run test:full`

## 📝 License

MIT License - see LICENSE file for details 