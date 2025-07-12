#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get version from command line argument or prompt
const newVersion = process.argv[2];

if (!newVersion) {
  console.error('Usage: node scripts/update-version.js <version>');
  console.error('Example: node scripts/update-version.js 1.2.0');
  process.exit(1);
}

// Validate version format
const versionPattern = /^\d+\.\d+\.\d+$/;
if (!versionPattern.test(newVersion)) {
  console.error('Error: Version must be in format x.y.z (e.g., 1.2.0)');
  process.exit(1);
}

// List of files to update
const filesToUpdate = [
  'package.json',
  'frontend/package.json',
  'backend/package.json',
  'docker-compose.yml'
];

console.log(`Updating version to ${newVersion}...`);

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
  }
});

console.log('\n📦 Version update complete!');
console.log('\nNext steps:');
console.log('1. Review the changes: git diff');
console.log('2. Test the application: npm test');
console.log('3. Build new Docker images: docker compose build');
console.log('4. Commit the changes: git add . && git commit -m "Bump version to v' + newVersion + '"');
console.log('5. Create a git tag: git tag v' + newVersion);
console.log('6. Push changes: git push && git push --tags'); 