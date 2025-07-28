# 🍽️ Family Meal Planner

A comprehensive, AI-powered meal planning application for families to organize, plan, and manage their weekly meals with intelligent recommendations, 2FA security, and advanced administrative features.

## ✨ Key Features

### 🤖 **AI Meal Recommendations**
- **Machine Learning Service**: Dedicated Python ML service with collaborative filtering, content-based filtering, and hybrid models
- **Personalized Suggestions**: Learn from user behavior and meal history
- **Smart Integration**: One-click meal planning from recommendations
- **Fallback System**: Always shows recommendations even when ML service is unavailable

### 🔐 **Advanced Security & Authentication**
- **Two-Factor Authentication (2FA)**: TOTP-based 2FA with QR code setup
- **JWT Security**: Secure token-based authentication
- **Admin Controls**: Dual password system for admin users
- **Role-Based Access**: Different permission levels for users and admins

### 📊 **Administrative Dashboard**
- **System Analytics**: Comprehensive overview of app usage
- **User Management**: Family member administration (admin-only)
- **Bug Tracking**: Built-in bug reporting and management system
- **Audit Logs**: Complete activity tracking with advanced filtering
- **Release Notes**: Version management and feature announcements

### 💾 **Data Management & Backup**
- **Database Backup**: Generate MongoDB backup scripts with version compatibility
- **Script Execution**: Direct MongoDB script execution with console output
- **Data Export**: Export meals, ingredients, stores, and family data
- **Restore Functionality**: Import and execute backup scripts safely

### 🎯 **Core Meal Planning**
- **Smart Calendar View**: Monthly, weekly, and daily meal planning views
- **Drag & Drop**: Intuitive meal assignment to dates and meal types
- **Meal Management**: Create, edit, and organize family recipes
- **Ingredient Tracking**: Comprehensive ingredient database with store associations
- **Shopping Integration**: Link meals to stores for shopping convenience

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Docker & Docker Compose
- npm

### Installation
```bash
# Clone the repository
git clone https://github.com/skpokala/meal-planner-app.git
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

# Start full application with Docker (includes ML service)
npm run dev:docker
```

## 🏗️ Architecture

### Frontend
- **React 18** with modern hooks
- **Tailwind CSS** for styling with dark/light theme support
- **React Router** for navigation with protected routes
- **Axios** for API communication
- **React Hot Toast** for notifications
- **Chart.js** for analytics visualization
- **Jest + Testing Library** for comprehensive testing

### Backend
- **Node.js + Express** REST API
- **MongoDB** with Mongoose ODM
- **JWT** authentication with 2FA TOTP support
- **bcryptjs** password hashing
- **speakeasy** for TOTP generation
- **Helmet + CORS** security middleware
- **Express Validator** for input validation
- **Jest + Supertest** for API testing

### ML Service (Python)
- **Flask** API server for ML predictions
- **scikit-learn** for machine learning models
- **pandas + numpy** for data processing
- **LightFM** for collaborative filtering
- **XGBoost** for hybrid recommendations
- **MongoDB** integration for user behavior data

### DevOps
- **Docker** multi-service containerization
- **GitHub Actions** CI/CD with automated testing
- **GitHub Container Registry (GHCR)** for image publishing
- **MongoDB Memory Server** for isolated testing
- **Comprehensive security auditing**

## 🎯 Application Structure

### User Pages
- **🏠 Dashboard**: Analytics overview with AI recommendations
- **📅 Meal Planner**: Interactive calendar for meal scheduling
- **🍽️ Meals**: Recipe management and creation
- **🥕 Ingredients**: Ingredient database with nutritional info
- **🏪 Stores**: Store management and address integration
- **👨‍👩‍👧‍👦 Family Members**: Family user management (admin-only)
- **⚙️ Settings**: Profile management and 2FA setup

### Administrative Features
- **🐛 Bug Management**: Track and prioritize user-reported issues
- **📋 Audit Logs**: Complete system activity monitoring
- **💾 Backup Management**: Database backup and restore operations
- **📝 Release Notes**: Version release management
- **🔧 Master Data**: Centralized data management hub

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

# Build Docker images (includes ML service)
npm run docker:build
```

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Quick test suite (frontend + backend + security) |
| `npm run test:full` | Complete test suite including Docker |
| `npm run test:frontend` | Frontend tests only |
| `npm run test:backend` | Backend tests with coverage |
| `npm run test:security` | Security audit for all services |
| `npm run build` | Production build |
| `npm run docker:build` | Build Docker images |
| `npm run docker:test` | Run Docker test suite |
| `npm run docker:clean` | Clean up Docker containers |
| `npm run install:all` | Install all dependencies |
| `npm run dev:frontend` | Start frontend dev server |
| `npm run dev:backend` | Start backend dev server |
| `npm run dev:docker` | Start with Docker Compose (full stack) |
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
- ✅ Frontend tests (17+ tests)
- ✅ Backend tests (25+ tests) 
- ✅ Security audits
- ⏱️ ~45 seconds

#### `./test-local.sh` - Complete GitHub Actions Simulation
- ✅ Frontend tests + build
- ✅ Backend tests + coverage
- ✅ Security audits
- ✅ Docker production builds (3 services)
- ✅ Docker test execution
- ⏱️ ~5-8 minutes

## 🔢 Versioning

The application features **automatic version increment** with every git push:

- **🚀 Auto-increment**: Patch version (e.g., 1.1.90 → 1.1.91) increments automatically
- **📦 Git Hook**: Pre-push hook handles version bumping seamlessly
- **🎯 Smart Detection**: Only increments when there are actual commits to push
- **🔄 Auto-commit**: Version changes are committed automatically
- **📱 Live Display**: Version shown at bottom of application

### Manual Version Management
```bash
# Update to specific version
npm run version:update 1.2.0

# Push without version increment (if needed)
git push --no-verify
```

For complete versioning details, see **[VERSIONING.md](VERSIONING.md)**.

## 📦 Container Registry

The application is **automatically published to GitHub Container Registry (GHCR)** with every push:

- **🚀 Auto-publishing**: Docker images built and published automatically
- **🏷️ Version tagging**: Images tagged with both `latest` and version numbers
- **🌐 Multi-platform**: Supports `linux/amd64` and `linux/arm64`
- **📋 Easy deployment**: Production-ready Docker images available immediately
- **🤖 ML Service**: Complete ML service containerized and ready

### Quick Deployment
```bash
# Download and start latest version (includes ML service)
curl -O https://raw.githubusercontent.com/skpokala/meal-planner-app/main/docker-compose.prod.yml
export JWT_SECRET="your-secure-jwt-secret-$(openssl rand -hex 32)"
docker-compose -f docker-compose.prod.yml up -d
```

For complete GHCR publishing details, see **[GHCR_PUBLISHING.md](GHCR_PUBLISHING.md)**.

## 🚀 Deployment

### Docker Images (GHCR)

The application is available as Docker images on GitHub Container Registry:

- **Frontend**: `ghcr.io/skpokala/meal-planner-app-frontend:latest`
- **Backend**: `ghcr.io/skpokala/meal-planner-app-backend:latest`
- **ML Service**: `ghcr.io/skpokala/meal-planner-app-ml-service:latest`

### Quick Deployment

```bash
# One-command deployment (full stack with ML)
export JWT_SECRET="your-secure-jwt-secret-$(openssl rand -hex 32)"
curl -O https://raw.githubusercontent.com/skpokala/meal-planner-app/main/docker-compose.prod.yml
docker-compose -f docker-compose.prod.yml up -d
```

🎉 **Access the app at**: http://localhost:3000

### Services & Ports

- **Frontend**: Port 3000 (React application)
- **Backend**: Port 5002 (Node.js API)
- **ML Service**: Port 5003 (Python Flask ML API)
- **Database**: Port 27017 (MongoDB)

### Features

- 📦 **Multi-arch images** (amd64, arm64)
- 🔒 **Security-hardened** containers
- 📊 **Health checks** and monitoring
- 🔄 **Automated updates** via GitHub Actions
- 💾 **Persistent data** with Docker volumes
- 🤖 **ML Service** containerized and integrated

For complete deployment instructions, see **[DEPLOYMENT.md](DEPLOYMENT.md)**.

## 🔒 Security Features

- 🛡️ **Production Dependencies**: 0 vulnerabilities
- 🔐 **Two-Factor Authentication**: TOTP-based 2FA with QR codes
- 🔑 **JWT Security**: Secure token-based authentication
- 🚫 **Rate Limiting**: API protection against abuse
- 🛡️ **Security Headers**: Helmet.js implementation
- 🔍 **Automated Auditing**: CI/CD security validation
- 👨‍💼 **Role-Based Access**: Admin vs user permissions
- 🔐 **Password Security**: bcrypt hashing with salt rounds
- 🛡️ **Input Validation**: Express validator for all endpoints

## 📊 Test Coverage & Quality

- **Frontend**: 17+ tests covering components, pages, and services
- **Backend**: 25+ tests covering all API endpoints and authentication
- **ML Service**: Integrated testing with fallback mechanisms
- **Security**: 0 production vulnerabilities across all services
- **Docker**: Production + test builds validated
- **E2E Coverage**: Complete user workflows tested

## 🎨 UI/UX Features

- **🌙 Dark/Light Theme**: Complete theme support with persistence
- **📱 Responsive Design**: Mobile-first approach with Tailwind CSS
- **🎨 Modern UI**: Clean, intuitive interface with consistent styling
- **⚡ Real-time Updates**: Live notifications and status updates
- **📊 Data Visualization**: Charts and analytics dashboards
- **🔍 Advanced Filtering**: Search and filter across all data types
- **💫 Smooth Animations**: Polished user interactions
- **🎯 Accessibility**: Screen reader and keyboard navigation support

## 🚀 Recent Major Updates (v1.1.12 → v1.1.92)

### 🤖 AI & ML Integration
- **Complete ML Service**: Python-based recommendation engine
- **Hybrid Models**: Collaborative filtering + content-based recommendations
- **Smart Fallbacks**: Always functional even when ML service unavailable
- **One-click Planning**: Add recommendations directly to meal plans

### 🔐 Security Enhancements
- **2FA TOTP**: Complete two-factor authentication system
- **Enhanced Admin Controls**: Improved role-based access
- **Security Auditing**: Comprehensive activity logging

### 📊 Administrative Tools
- **Bug Tracking**: Complete issue management system
- **Audit Logs**: Detailed activity monitoring with filtering
- **Release Notes**: Version management and announcements
- **Data Backup**: MongoDB backup and restore capabilities
- **Script Execution**: Direct database script execution with console output

### 🎯 UI/UX Improvements
- **Enhanced Dashboard**: AI recommendations integration
- **Better Navigation**: Section icons and improved layout
- **Consistent Styling**: App-wide design system implementation
- **Dark Mode**: Complete theme support with persistence

## 🤝 Contributing

1. Run tests before committing: `npm test`
2. Use conventional commit messages
3. Ensure all GitHub Actions checks pass
4. Full validation: `npm run test:full`
5. Follow the established code style and patterns

## 📈 Roadmap

### Upcoming Features
- **Mobile App**: React Native implementation
- **Social Features**: Family meal sharing and collaboration
- **Nutrition Tracking**: Detailed nutritional analysis
- **Shopping Lists**: Auto-generated shopping lists from meal plans
- **Recipe Sharing**: Community recipe exchange

## 📝 License

MIT License - see LICENSE file for details

---

**Current Version**: v1.1.92 | **Last Updated**: December 2024 