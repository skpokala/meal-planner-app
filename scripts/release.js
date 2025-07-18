#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get version from command line argument
const newVersion = process.argv[2];
const commitMessage = process.argv[3];

if (!newVersion || !commitMessage) {
  console.error('Usage: node scripts/release.js <version> <commit-message>');
  console.error('Example: node scripts/release.js 1.2.0 "feat: Add new feature"');
  process.exit(1);
}

// Validate version format
const versionPattern = /^\d+\.\d+\.\d+$/;
if (!versionPattern.test(newVersion)) {
  console.error('Error: Version must be in format x.y.z (e.g., 1.2.0)');
  process.exit(1);
}

console.log(`🚀 Starting release process for version ${newVersion}...`);

// Check if we're in a git repository
try {
  execSync('git rev-parse --git-dir', { stdio: 'ignore' });
} catch (error) {
  console.error('Error: Not in a git repository');
  process.exit(1);
}

// Check if there are uncommitted changes
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  if (status.trim()) {
    console.error('Error: You have uncommitted changes. Please commit or stash them first.');
    console.error('Uncommitted changes:');
    console.error(status);
    process.exit(1);
  }
} catch (error) {
  console.error('Error checking git status:', error.message);
  process.exit(1);
}

// List of files to update
const filesToUpdate = [
  'package.json',
  'frontend/package.json',
  'backend/package.json',
  'docker-compose.yml'
];

console.log(`📝 Updating version to ${newVersion}...`);

// Update each file
filesToUpdate.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.warn(`Warning: ${filePath} not found, skipping...`);
    return;
  }

  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    if (filePath.endsWith('.json')) {
      // Update package.json files
      const packageJson = JSON.parse(content);
      const oldVersion = packageJson.version;
      packageJson.version = newVersion;
      
      content = JSON.stringify(packageJson, null, 2) + '\n';
      fs.writeFileSync(fullPath, content);
      
      console.log(`✅ Updated ${filePath}: ${oldVersion} → ${newVersion}`);
    } else if (filePath === 'docker-compose.yml') {
      // Update docker-compose.yml
      const oldVersionMatch = content.match(/REACT_APP_VERSION: "([\d.]+)"/);
      if (oldVersionMatch) {
        const oldVersion = oldVersionMatch[1];
        content = content.replace(
          /REACT_APP_VERSION: "[\d.]+"/,
          `REACT_APP_VERSION: "${newVersion}"`
        );
        fs.writeFileSync(fullPath, content);
        console.log(`✅ Updated ${filePath}: ${oldVersion} → ${newVersion}`);
      } else {
        console.warn(`Warning: Could not find version in ${filePath}`);
      }
    }
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message);
    process.exit(1);
  }
});

console.log('\n📦 Version files updated successfully!');

// Check if tag already exists
try {
  const tagExists = execSync(`git rev-parse --verify refs/tags/v${newVersion}`, { stdio: 'ignore' });
  console.error(`Error: Tag v${newVersion} already exists`);
  process.exit(1);
} catch (error) {
  // Tag doesn't exist, which is what we want
}

// Stage the version files
console.log('\n📋 Staging version files...');
try {
  filesToUpdate.forEach(filePath => {
    if (fs.existsSync(path.join(__dirname, '..', filePath))) {
      execSync(`git add ${filePath}`, { stdio: 'ignore' });
    }
  });
  console.log('✅ Version files staged');
} catch (error) {
  console.error('Error staging files:', error.message);
  process.exit(1);
}

// Create commit with combined message
const fullCommitMessage = `${commitMessage}

- Bump version to v${newVersion}`;

console.log('\n💾 Creating commit...');
try {
  execSync(`git commit -m "${fullCommitMessage}"`, { stdio: 'inherit' });
  console.log('✅ Commit created successfully');
} catch (error) {
  console.error('Error creating commit:', error.message);
  process.exit(1);
}

// Create tag
console.log('\n🏷️  Creating tag...');
try {
  execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { stdio: 'inherit' });
  console.log(`✅ Tag v${newVersion} created`);
} catch (error) {
  console.error('Error creating tag:', error.message);
  process.exit(1);
}

// Push commit and tag
console.log('\n🚀 Pushing to remote...');
try {
  execSync('git push origin main', { stdio: 'inherit' });
  console.log('✅ Commit pushed to main');
  
  execSync(`git push origin v${newVersion}`, { stdio: 'inherit' });
  console.log(`✅ Tag v${newVersion} pushed`);
} catch (error) {
  console.error('Error pushing to remote:', error.message);
  console.error('You may need to push manually:');
  console.error(`  git push origin main`);
  console.error(`  git push origin v${newVersion}`);
  process.exit(1);
}

console.log('\n🎉 Release process completed successfully!');
console.log(`\n📊 Summary:`);
console.log(`   📦 Version: ${newVersion}`);
console.log(`   🏷️  Tag: v${newVersion}`);
console.log(`   💾 Commit: ${commitMessage}`);
console.log(`   🚀 Pushed to: origin/main`);
console.log(`\n🔗 GitHub Actions should now be running with a single workflow trigger.`); 