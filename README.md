# Family Meal Planner App

A comprehensive meal planning application for families with Docker setup and MongoDB integration.

## Features

- 🍽️ Family meal planning with calendar view
- 👥 Family member management
- 🔐 Secure authentication system
- 🐳 Complete Docker setup
- 📊 Admin dashboard

## Quick Start

### Prerequisites

- Docker and Docker Compose installed on your system
- Git (to clone the repository)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd meal-planner-app
```

2. Start the application with Docker Compose:
```bash
docker-compose up --build
```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - MongoDB: localhost:27017

### Default Login

- **Username:** admin
- **Password:** password

## Development

### Project Structure

```
meal-planner-app/
├── backend/              # Node.js/Express API
├── frontend/             # React application
├── docker-compose.yml    # Docker configuration
├── .env                  # Environment variables
└── README.md            # This file
```

### Environment Variables

Copy `.env.example` to `.env` and adjust the values as needed.

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Family Members
- `GET /api/family-members` - Get all family members
- `POST /api/family-members` - Add new family member
- `PUT /api/family-members/:id` - Update family member
- `DELETE /api/family-members/:id` - Delete family member

### Meals
- `GET /api/meals` - Get all meals
- `POST /api/meals` - Add new meal
- `PUT /api/meals/:id` - Update meal
- `DELETE /api/meals/:id` - Delete meal

## Docker Commands

### Build and start services
```bash
docker-compose up --build
```

### Stop services
```bash
docker-compose down
```

### View logs
```bash
docker-compose logs -f
```

### Rebuild specific service
```bash
docker-compose up --build backend
```

## Database Setup

MongoDB is automatically configured and started with Docker Compose. The database will be initialized with default admin credentials and sample data.

## Testing

This project includes comprehensive unit tests for both frontend and backend components.

### Running Tests Locally

#### Frontend Tests
```bash
cd frontend

# Run tests in watch mode (development)
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode (single run)
npm run test:ci
```

#### Backend Tests
```bash
cd backend

# Run tests in watch mode (development)
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in CI mode (single run)
npm run test:ci
```

### Running Tests with Docker

#### Test Both Frontend and Backend
```bash
# Run tests using Docker Compose
docker-compose -f docker-compose.test.yml up --build

# Run tests and remove containers
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
docker-compose -f docker-compose.test.yml down
```

#### Test Individual Services
```bash
# Test only frontend
docker-compose -f docker-compose.test.yml up --build frontend-test

# Test only backend
docker-compose -f docker-compose.test.yml up --build backend-test
```

### Test Coverage

- **Frontend**: 70% minimum coverage threshold
- **Backend**: 60% minimum coverage threshold

Coverage reports are generated in:
- Frontend: `frontend/coverage/`
- Backend: `backend/coverage/`

### Test Structure

#### Frontend Tests
```
frontend/src/
├── __tests__/
│   ├── components/
│   │   └── LoadingSpinner.test.js
│   ├── contexts/
│   │   └── AuthContext.test.js
│   ├── pages/
│   │   ├── Dashboard.test.js
│   │   └── Login.test.js
│   ├── services/
│   │   └── api.test.js
│   └── utils/
│       └── testUtils.js
└── setupTests.js
```

#### Backend Tests
```
backend/
├── __tests__/
│   └── auth.test.js
└── tests/
    └── setup.js
```

### Continuous Integration

Tests are automatically run on every push and pull request via GitHub Actions:

- ✅ Frontend unit tests
- ✅ Backend unit tests  
- ✅ Docker build tests
- ✅ Security audits
- ✅ Code coverage reports

### Pre-commit Testing

The build process includes automatic test execution:

```bash
# Frontend build (includes tests)
npm run build  # Runs tests before building

# Skip tests during build (for production)
npm run build:skip-tests
```

### Writing Tests

#### Frontend Test Guidelines
- Use React Testing Library for component tests
- Mock API calls using Jest mocks
- Test user interactions and accessibility
- Include error handling scenarios

#### Backend Test Guidelines
- Use Supertest for API endpoint testing
- Use in-memory MongoDB for database tests
- Test authentication and authorization
- Include validation and error handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. **Run tests locally**: `npm run test:coverage`
5. **Ensure tests pass**: All tests must pass before submitting
6. **Maintain coverage**: New code should include appropriate tests
7. Submit a pull request

### Pull Request Requirements

- ✅ All tests passing
- ✅ Code coverage maintained above thresholds
- ✅ No security vulnerabilities
- ✅ Docker build successful

## License

MIT License 