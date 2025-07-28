# Versioning System

This document describes the versioning system implemented in the Meal Planner application.

## Overview

The app now displays version information in the bottom center of the screen, showing both frontend and backend versions when they differ.

## Version Display

- **Location**: Bottom center of the screen (fixed position)
- **Appearance**: Semi-transparent badge with version number
- **Content**: Shows frontend version (e.g., "v1.1.0") and backend version if different (e.g., "API v1.0.0")

## Version Management

### Current Version: 1.1.0

### Version Sources

- **Frontend**: Version from `frontend/package.json` passed via `REACT_APP_VERSION` environment variable
- **Backend**: Version from `backend/package.json` served via `/api/version` endpoint

### Files Containing Version Information

1. `package.json` - Main project version
2. `frontend/package.json` - Frontend version
3. `backend/package.json` - Backend version
4. `docker-compose.yml` - Docker build version argument

## Updating Versions

### Automatic Update (Recommended)

Use the provided script to update versions across all files:

```bash
# Update to a new version
npm run version:update 1.2.0

# Or run directly
node scripts/update-version.js 1.2.0
```

This script will:
- Update all package.json files
- Update Docker Compose version arguments
- Show next steps for committing changes

### Manual Update

1. Update version in `package.json`
2. Update version in `frontend/package.json`
3. Update version in `backend/package.json`
4. Update `REACT_APP_VERSION` in `docker-compose.yml`

## Build Process

### Development

- Frontend: Version automatically included via `REACT_APP_VERSION=$npm_package_version`
- Backend: Version read from package.json at runtime

### Production Docker Build

```bash
# Build with version
docker build --build-arg REACT_APP_VERSION=1.1.0 -t meal-planner-frontend .

# Or use docker-compose (version automatically passed)
docker compose build
```

## API Endpoints

### GET /api/version

Returns version information for the backend:

```json
{
  "success": true,
  "version": "1.1.0",
  "name": "meal-planner-backend",
  "description": "Backend API for Family Meal Planner",
  "timestamp": "2025-01-12T17:00:00.000Z"
}
```

## Testing

### Frontend Tests

Tests for the Version component:

```bash
cd frontend
npm test -- --testPathPattern=Version.test.js
```

### Backend Tests

Tests for the version endpoint:

```bash
cd backend
npm test -- --testPathPattern=version.test.js
```

## Implementation Details

### Frontend Component

- **File**: `frontend/src/components/Version.js`
- **Features**:
  - Displays frontend version from environment variable
  - Fetches backend version from API
  - Shows both versions when they differ
  - Handles API errors gracefully
  - Fixed positioning at bottom center

### Backend Route

- **File**: `backend/routes/version.js`
- **Endpoint**: `/api/version`
- **Features**:
  - Returns version from package.json
  - Includes timestamp and package metadata
  - No authentication required

### Styling

- Semi-transparent background with backdrop blur
- Responsive design
- Dark mode support
- Minimal visual footprint

## Deployment

### Local Development

Version automatically available during development:

```bash
npm run dev:frontend  # Version included automatically
npm run dev:backend   # Version endpoint available
```

### Docker Development

```bash
docker compose up  # Version passed as build argument
```

### Production Deployment

For production builds, ensure version is passed:

```bash
# GitHub Actions automatically passes version
# Manual builds should include version argument
docker build --build-arg REACT_APP_VERSION=$(cat package.json | jq -r .version) .
```

## Release Process

1. Update version using the script:
   ```bash
   npm run version:update 1.2.0
   ```

2. Review changes:
   ```bash
   git diff
   ```

3. Test the application:
   ```bash
   npm test
   ```

4. Build and test Docker images:
   ```bash
   docker compose build
   docker compose up
   ```

5. Commit changes:
   ```bash
   git add .
   git commit -m "Bump version to v1.2.0"
   ```

6. Create git tag:
   ```bash
   git tag v1.2.0
   ```

7. Push changes:
   ```bash
   git push && git push --tags
   ```

## Troubleshooting

### Version Not Displaying

1. Check environment variable: `echo $REACT_APP_VERSION`
2. Verify build includes version: Check Docker build logs
3. Check console for API errors

### Version Mismatch

- Frontend and backend versions may differ during development
- Both versions are shown when they differ
- Ensure both are updated when releasing

### API Version Endpoint Not Working

1. Check backend is running
2. Verify route is registered in `backend/app.js`
3. Check for CORS issues

## Automatic Version Increment

The application now automatically increments the patch version (e.g., 1.1.0 → 1.1.1) with every git push through a pre-push hook.

### How It Works

1. **Pre-push Hook**: A git pre-push hook (`.git/hooks/pre-push`) automatically runs before every push
2. **Version Detection**: Detects if there are new commits to push
3. **Auto-increment**: Automatically increments the patch version using the existing `update-version.js` script
4. **Auto-commit**: Commits the version changes with message: `chore: bump version to vX.Y.Z [skip ci]`
5. **Continues Push**: Proceeds with the original push including the version increment

### Setup

The pre-push hook is already set up and executable. No additional configuration needed.

### Behavior

- **New commits**: Version is automatically incremented
- **No new commits**: Hook skips version increment
- **Version update failure**: Push is aborted to prevent issues
- **CI Integration**: Version commits include `[skip ci]` to avoid triggering unnecessary builds

### Manual Override

If you need to push without incrementing the version:

```bash
# Push without running hooks
git push --no-verify
```

### Monitoring

The hook provides colored output to show:
- 🚀 Hook activation
- 📦 Version increment process
- ✅ Successful completion
- ❌ Any errors

## Future Enhancements

- [ ] Add build timestamp to version display
- [ ] Add git commit hash to version info
- [ ] Add version history tracking
- [x] Add automatic version bumping on releases
- [ ] Add version compatibility checking 