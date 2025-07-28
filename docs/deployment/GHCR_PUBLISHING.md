# 🚀 GitHub Container Registry (GHCR) Publishing

This document explains how the automated publishing system works for the Meal Planner app.

## 🎯 Overview

The application automatically publishes Docker images to GitHub Container Registry (GHCR) with every push to the main branch. This ensures that the latest version is always available for deployment.

## 🔧 How It Works

### 1. **Trigger Mechanism**
- **Push to main branch**: Automatically triggers publishing workflow
- **Push to tags**: Publishes specific version releases
- **Manual trigger**: Available via GitHub Actions UI
- **Skip CI commits**: Version increment commits include `[skip ci]` to prevent duplicate workflows

### 2. **Version Management**
- **Automatic increment**: Version increments with every push (e.g., 1.1.4 → 1.1.5)
- **Version tagging**: Docker images tagged with both `latest` and version number
- **Git tags**: Automatically created after successful builds
- **Build args**: Version passed to Docker builds for frontend display

### 3. **Workflow Steps**

#### 🧪 **Testing Phase**
1. **Frontend tests**: 39 tests including coverage
2. **Backend tests**: 120 tests with MongoDB integration
3. **Security audits**: Vulnerability scanning
4. **Dependency validation**: Ensures all packages are secure

#### 🏗️ **Build & Push Phase**
1. **Multi-platform builds**: Supports `linux/amd64` and `linux/arm64`
2. **Docker layer caching**: Optimizes build speed
3. **Parallel matrix builds**: Frontend and backend built simultaneously
4. **Metadata extraction**: Generates comprehensive tags and labels

#### 📦 **Publishing Phase**
1. **GHCR login**: Authenticates with GitHub Container Registry
2. **Image push**: Publishes to `ghcr.io/skpokala/meal-planner-app-{service}`
3. **Compose generation**: Creates production docker-compose files
4. **Tag creation**: Automatically creates git tags
5. **Release creation**: Generates GitHub releases for version tags

## 🏷️ Image Tags

Each successful build creates multiple tags:

### **Frontend Image: `ghcr.io/skpokala/meal-planner-app-frontend`**
- `latest` - Latest main branch build
- `1.1.5` - Specific version number
- `v1.1.5` - Version with 'v' prefix
- `main-{sha}` - Branch with commit hash

### **Backend Image: `ghcr.io/skpokala/meal-planner-app-backend`**
- `latest` - Latest main branch build
- `1.1.5` - Specific version number
- `v1.1.5` - Version with 'v' prefix
- `main-{sha}` - Branch with commit hash

## 🚀 Deployment Options

### **Option 1: Using Latest Images**
```bash
# Download production compose file
curl -O https://raw.githubusercontent.com/skpokala/meal-planner-app/main/docker-compose.prod.yml

# Set environment variables
export JWT_SECRET="your-secure-jwt-secret-$(openssl rand -hex 32)"

# Start the application
docker-compose -f docker-compose.prod.yml up -d
```

### **Option 2: Using Specific Version**
```bash
# Use specific version images
docker run -d --name meal-planner-frontend \
  -p 3000:3000 \
  ghcr.io/skpokala/meal-planner-app-frontend:1.1.5

docker run -d --name meal-planner-backend \
  -p 5000:5000 \
  -e JWT_SECRET="your-secret" \
  ghcr.io/skpokala/meal-planner-app-backend:1.1.5
```

### **Option 3: Manual Pull**
```bash
# Pull specific images
docker pull ghcr.io/skpokala/meal-planner-app-frontend:latest
docker pull ghcr.io/skpokala/meal-planner-app-backend:latest

# Or specific version
docker pull ghcr.io/skpokala/meal-planner-app-frontend:1.1.5
docker pull ghcr.io/skpokala/meal-planner-app-backend:1.1.5
```

## 📊 Build Status

You can monitor build status in several ways:

### **GitHub Actions Tab**
- Go to your repository → Actions tab
- View "Build and Publish to GHCR" workflow runs
- Check logs for detailed build information

### **GitHub Packages**
- Go to your repository → Packages tab
- View published container images
- Check image tags and download counts

### **Version Display**
- The application displays the current version in the bottom-center
- Shows both frontend and backend versions when different

## 🔒 Security & Permissions

### **Required Permissions**
- `contents: read` - Read repository contents
- `packages: write` - Publish to GitHub Container Registry
- `contents: write` - Create git tags and releases

### **Authentication**
- Uses `GITHUB_TOKEN` for authentication
- No additional secrets required
- Automatically authenticated in GitHub Actions

### **Security Features**
- Multi-platform builds for broader compatibility
- Vulnerability scanning during tests
- Secure environment variable handling
- Production-ready Docker images

## 🛠️ Troubleshooting

### **Build Failures**
1. **Check test results**: Tests must pass before publishing
2. **Verify dependencies**: Ensure all packages are installed
3. **Review logs**: GitHub Actions provides detailed logs
4. **Check permissions**: Ensure repository has package permissions

### **Image Not Found**
1. **Verify tag**: Check if the tag exists in GitHub Packages
2. **Check spelling**: Ensure correct image name format
3. **Authentication**: Verify GitHub token permissions
4. **Registry**: Confirm using `ghcr.io` registry

### **Version Mismatches**
1. **Clear cache**: Docker build cache might be stale
2. **Force rebuild**: Use `--no-cache` flag
3. **Check version**: Verify package.json version
4. **Sync git**: Ensure local and remote are in sync

## 🔄 Workflow Configuration

The publishing workflow (`.github/workflows/publish.yml`) includes:

### **Triggers**
```yaml
on:
  push:
    branches: [ main ]
    tags: [ 'v*.*.*' ]
  release:
    types: [ published ]
  workflow_dispatch:  # Manual trigger
```

### **Environment Variables**
```yaml
env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ghcr.io/${{ github.repository }}
```

### **Key Features**
- **Conditional execution**: Skips on `[skip ci]` commits
- **Version integration**: Reads version from package.json
- **Multi-platform support**: Builds for multiple architectures
- **Automated tagging**: Creates git tags for releases
- **Comprehensive logging**: Detailed build summaries

## 📈 Benefits

### **For Developers**
- **Automated workflow**: No manual Docker builds required
- **Version consistency**: Automatic version management
- **Easy testing**: Pull specific versions for testing
- **CI/CD integration**: Seamless deployment pipeline

### **For Users**
- **Always updated**: Latest version available immediately
- **Reliable deployments**: Tested images only
- **Multiple options**: Various deployment methods
- **Version control**: Easy rollback to previous versions

## 🎉 Summary

Your Meal Planner app now has a fully automated publishing system that:

✅ **Publishes to GHCR with every push**  
✅ **Automatically increments versions**  
✅ **Creates git tags for releases**  
✅ **Provides multiple deployment options**  
✅ **Includes comprehensive testing**  
✅ **Supports multi-platform deployment**  

The system is now ready for production use! 🚀 