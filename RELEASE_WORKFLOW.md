# Release Workflow

This document describes the unified release process that prevents multiple GitHub Actions triggers.

## The Problem

Previously, our release process involved:
1. Committing feature changes → **Triggers GitHub Actions**
2. Running version update script → **Triggers GitHub Actions again**
3. Creating git tag → **Triggers GitHub Actions a third time**

This resulted in multiple workflow runs and duplicate version bumps.

## The Solution

We now have a unified release script that combines all operations into a single commit and push.

## Usage

### Using the Release Script

```bash
node scripts/release.js <version> <commit-message>
```

**Example:**
```bash
node scripts/release.js 1.2.0 "feat: Add user authentication system"
```

### What the Script Does

1. **Validates inputs**: Checks version format and commit message
2. **Checks git status**: Ensures no uncommitted changes
3. **Updates version files**: Updates package.json files and docker-compose.yml
4. **Creates combined commit**: Merges feature changes with version bump
5. **Creates git tag**: Tags the release
6. **Pushes everything**: Single push triggers GitHub Actions only once

### Before You Release

1. **Ensure all changes are committed** (except version files)
2. **Run tests** to make sure everything works
3. **Choose appropriate version** following [semantic versioning](https://semver.org/)

### Manual Process (Not Recommended)

If you need to do it manually:

```bash
# 1. Make your feature changes and commit them
git add .
git commit -m "feat: Add new feature

- Feature implementation details
- Version bump to v1.2.0"

# 2. Update version (only if using manual process)
node scripts/update-version.js 1.2.0

# 3. Amend the commit to include version changes
git add .
git commit --amend --no-edit

# 4. Create tag and push
git tag v1.2.0
git push origin main --tags
```

## GitHub Actions Behavior

With the new workflow:
- ✅ **Single trigger**: Only one GitHub Actions run per release
- ✅ **Clean history**: One commit with feature + version changes
- ✅ **Proper tagging**: Automatic tag creation and pushing
- ✅ **No duplicates**: Prevents multiple workflow runs

## Version Format

Use [semantic versioning](https://semver.org/):
- **Major**: `2.0.0` - Breaking changes
- **Minor**: `1.2.0` - New features (backward compatible)
- **Patch**: `1.1.1` - Bug fixes (backward compatible)

## Files Updated

The script automatically updates:
- `package.json` (root)
- `frontend/package.json`
- `backend/package.json`
- `docker-compose.yml`

## Error Handling

The script will exit with an error if:
- Invalid version format
- Uncommitted changes exist
- Git tag already exists
- Git operations fail

## Benefits

1. **Prevents duplicate GitHub Actions runs**
2. **Cleaner git history**
3. **Automated version management**
4. **Consistent release process**
5. **Error prevention and validation** 