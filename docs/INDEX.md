# 📚 Documentation Index

This directory contains comprehensive documentation for the Family Meal Planner application. All documentation is organized by category for easy navigation.

## 📋 Quick Navigation

| Category | Files | Description |
|----------|-------|-------------|
| **🚀 [Deployment](#-deployment)** | 4 files | Production deployment guides and troubleshooting |
| **⚙️ [Features](#️-features)** | 3 files | Feature documentation and setup guides |
| **🔧 [Development](#-development)** | 3 files | Development processes, versioning, and testing |
| **📖 [Project Info](#-project-information)** | 2 files | Changelog and maintenance procedures |

---

## 🚀 Deployment

**Production deployment, containerization, and troubleshooting guides**

### [`DEPLOYMENT.md`](deployment/DEPLOYMENT.md)
- **Purpose**: Main deployment guide for the application
- **Contents**: Docker Compose setup, environment configuration, production best practices
- **Audience**: DevOps, system administrators
- **Referenced in**: Main README.md

### [`GHCR_PUBLISHING.md`](deployment/GHCR_PUBLISHING.md)  
- **Purpose**: GitHub Container Registry publishing documentation
- **Contents**: Automatic image publishing, GHCR setup, multi-platform builds
- **Audience**: CI/CD administrators, developers
- **Referenced in**: Main README.md

### [`PORTAINER_DEPLOYMENT.md`](deployment/PORTAINER_DEPLOYMENT.md)
- **Purpose**: Portainer-specific deployment guide with CORS fixes
- **Contents**: Portainer stack configuration, runtime URL detection, troubleshooting
- **Audience**: Portainer users, system administrators
- **Status**: ⚠️ Not referenced in main README

### [`PORTAINER_LOGIN_FIX.md`](deployment/PORTAINER_LOGIN_FIX.md)
- **Purpose**: Urgent fixes for Portainer login issues
- **Contents**: CORS configuration, network troubleshooting, quick fixes
- **Audience**: Portainer users experiencing login issues
- **Status**: ⚠️ Not referenced in main README

---

## ⚙️ Features

**Feature-specific documentation and setup guides**

### [`ADDRESS_AUTOCOMPLETE_SETUP.md`](features/ADDRESS_AUTOCOMPLETE_SETUP.md)
- **Purpose**: Address autocomplete functionality using Nominatim API
- **Contents**: Nominatim setup, OpenStreetMap integration, usage examples
- **Audience**: Developers, users setting up store addresses
- **Status**: ⚠️ Not referenced in main README

### [`AUTOSAVE_SUMMARY.md`](features/AUTOSAVE_SUMMARY.md)
- **Purpose**: Comprehensive autosave functionality documentation
- **Contents**: Optimistic updates, backend persistence, meal planning autosave
- **Audience**: Developers, technical users
- **Status**: ⚠️ Not referenced in main README

### [`DUAL_PASSWORD_SYSTEM.md`](features/DUAL_PASSWORD_SYSTEM.md)
- **Purpose**: Admin dual authentication system documentation
- **Contents**: Master password setup, dual login functionality, security features
- **Audience**: Administrators, security personnel
- **Status**: ⚠️ Not referenced in main README

---

## 🔧 Development

**Development processes, versioning, testing, and contributor guides**

### [`VERSIONING.md`](development/VERSIONING.md)
- **Purpose**: Application versioning system and auto-increment functionality
- **Contents**: Git hooks, version management, release processes
- **Audience**: Developers, maintainers
- **Referenced in**: Main README.md

### [`RELEASE_WORKFLOW.md`](development/RELEASE_WORKFLOW.md)
- **Purpose**: Unified release process to prevent multiple GitHub Actions triggers
- **Contents**: Release script, GitHub Actions optimization, workflow improvements
- **Audience**: Maintainers, CI/CD administrators
- **Status**: ⚠️ Not referenced in main README

### [`TEST_SUMMARY.md`](development/TEST_SUMMARY.md)
- **Purpose**: Testing architecture and coverage information
- **Contents**: Test results, separated meal/meal plan architecture, dashboard updates
- **Audience**: Developers, QA engineers
- **Status**: ⚠️ Not referenced in main README

---

## 📖 Project Information

**Project history, changes, and maintenance procedures**

### [`CHANGELOG.md`](CHANGELOG.md)
- **Purpose**: Historical record of all application changes and improvements
- **Contents**: Version history, feature additions, bug fixes, architecture changes
- **Audience**: All users, developers, project managers
- **Status**: ⚠️ Not referenced in main README

### [`README_MAINTENANCE.md`](README_MAINTENANCE.md)
- **Purpose**: README maintenance system and procedures
- **Contents**: Automatic update system, manual tools, maintenance procedures
- **Audience**: Maintainers, contributors
- **Status**: ✅ Internal documentation (not typically referenced in main README)

---

## 📊 Documentation Status

### ✅ **Referenced in Main README** (3 files)
- `deployment/DEPLOYMENT.md`
- `deployment/GHCR_PUBLISHING.md`  
- `development/VERSIONING.md`

### ⚠️ **Missing from Main README** (7 files)
- `deployment/PORTAINER_DEPLOYMENT.md`
- `deployment/PORTAINER_LOGIN_FIX.md`
- `features/ADDRESS_AUTOCOMPLETE_SETUP.md`
- `features/AUTOSAVE_SUMMARY.md`
- `features/DUAL_PASSWORD_SYSTEM.md`
- `development/RELEASE_WORKFLOW.md`
- `development/TEST_SUMMARY.md`
- `CHANGELOG.md`

### 📋 **Recommendations**
1. **Add documentation section** to main README.md
2. **Reference key feature docs** for user-facing features
3. **Link to deployment alternatives** (Portainer guides)
4. **Include changelog** for version history
5. **Consider combining** similar documents (e.g., Portainer files)

---

## 🛠️ Contributing to Documentation

### When Adding New Features:
1. **Create feature documentation** in `docs/features/`
2. **Update main README.md** with reference
3. **Add entry to this index** with proper categorization
4. **Test all links** and examples

### When Updating Existing Docs:
1. **Update the content** in the appropriate file
2. **Check main README references** are still accurate
3. **Update this index** if structure changes
4. **Run `npm run readme:update`** to sync versions

---

**Total Documentation Files**: 10 files organized across 4 categories  
**Last Updated**: July 2025 