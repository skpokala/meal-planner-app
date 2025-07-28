#!/bin/bash

# Documentation Link Checker
# Validates that all markdown files referenced in README exist

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📚 Documentation Link Checker${NC}"
echo -e "${BLUE}=============================${NC}"

# Counter for validation
TOTAL_LINKS=0
VALID_LINKS=0
BROKEN_LINKS=0

# Extract all markdown links from README.md
echo -e "${YELLOW}🔍 Scanning README.md for documentation links...${NC}"

# Find all links to markdown files in README.md
LINKS=$(grep -o '\[.*\](docs/[^)]*\.md)' README.md | sed 's/.*(\(.*\))/\1/')

if [ -z "$LINKS" ]; then
    echo -e "${RED}❌ No documentation links found in README.md${NC}"
    exit 1
fi

echo -e "${GREEN}Found documentation links:${NC}"

# Check each link
while IFS= read -r link; do
    if [ -n "$link" ]; then
        TOTAL_LINKS=$((TOTAL_LINKS + 1))
        if [ -f "$link" ]; then
            echo -e "${GREEN}✅ $link${NC}"
            VALID_LINKS=$((VALID_LINKS + 1))
        else
            echo -e "${RED}❌ $link (FILE NOT FOUND)${NC}"
            BROKEN_LINKS=$((BROKEN_LINKS + 1))
        fi
    fi
done <<< "$LINKS"

# Check for any markdown files not referenced in README
echo -e "\n${YELLOW}🔍 Checking for unreferenced documentation files...${NC}"

UNREFERENCED=()
while IFS= read -r file; do
    # Skip README.md itself and the INDEX.md (internal navigation)
    if [[ "$file" != "README.md" && "$file" != "docs/INDEX.md" ]]; then
        if ! grep -q "$file" README.md; then
            UNREFERENCED+=("$file")
        fi
    fi
done < <(find docs -name "*.md" -type f | sort)

if [ ${#UNREFERENCED[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All documentation files are referenced in README.md${NC}"
else
    echo -e "${YELLOW}⚠️  Unreferenced documentation files:${NC}"
    for file in "${UNREFERENCED[@]}"; do
        echo -e "${YELLOW}   - $file${NC}"
    done
fi

# Summary
echo -e "\n${BLUE}📊 Summary${NC}"
echo -e "${BLUE}==========${NC}"
echo -e "Total links checked: $TOTAL_LINKS"
echo -e "${GREEN}Valid links: $VALID_LINKS${NC}"
if [ $BROKEN_LINKS -gt 0 ]; then
    echo -e "${RED}Broken links: $BROKEN_LINKS${NC}"
fi
echo -e "${YELLOW}Unreferenced files: ${#UNREFERENCED[@]}${NC}"

# Exit status
if [ $BROKEN_LINKS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All documentation links are valid!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Found $BROKEN_LINKS broken link(s). Please fix before proceeding.${NC}"
    exit 1
fi 