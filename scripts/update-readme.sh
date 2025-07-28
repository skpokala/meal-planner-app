#!/bin/bash

# Manual README Update Script
# Run this to manually update README version and date without committing

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📝 Manual README Update Tool${NC}"
echo -e "${BLUE}===========================${NC}"

# Get current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")
CURRENT_DATE=$(date +"%B %Y")

echo -e "${GREEN}📦 Current version: $CURRENT_VERSION${NC}"
echo -e "${GREEN}📅 Current date: $CURRENT_DATE${NC}"

# Update the README footer with current version and date
echo -e "${YELLOW}🔄 Updating README.md...${NC}"

sed -i.bak "s/\*\*Current Version\*\*: v[0-9]\+\.[0-9]\+\.[0-9]\+ | \*\*Last Updated\*\*: .*/\*\*Current Version\*\*: v$CURRENT_VERSION | \*\*Last Updated\*\*: $CURRENT_DATE/" README.md

# Remove backup file
rm -f README.md.bak

echo -e "${GREEN}✅ README.md updated successfully!${NC}"
echo -e "${GREEN}📋 Version: v$CURRENT_VERSION${NC}"
echo -e "${GREEN}📅 Date: $CURRENT_DATE${NC}"
echo ""
echo -e "${BLUE}💡 Note: This update is not committed. Run 'git add README.md && git commit' to save changes.${NC}" 