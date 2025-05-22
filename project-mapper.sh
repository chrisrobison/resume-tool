#!/bin/bash

# JavaScript Project Mapper
# Generates a comprehensive project structure map for browser-based JavaScript projects
# Honors .gitignore files for cleaner analysis

PROJECT_DIR="${1:-.}"
OUTPUT_FILE="${2:-PROJECT_MAP.md}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if git is available and we're in a git repo
is_git_repo() {
    if command -v git >/dev/null 2>&1 && [ -d "$PROJECT_DIR/.git" ]; then
        return 0
    else
        return 1
    fi
}

# Function to get files respecting .gitignore
get_tracked_files() {
    local extension="$1"
    if is_git_repo; then
        # Use git ls-files to respect .gitignore
        (cd "$PROJECT_DIR" && git ls-files | grep -E "\\${extension}$" | while read file; do echo "$PROJECT_DIR/$file"; done)
    else
        # Fallback to find with common ignore patterns
        find "$PROJECT_DIR" -name "*${extension}" \
            -not -path "*/node_modules/*" \
            -not -path "*/.git/*" \
            -not -path "*/dist/*" \
            -not -path "*/build/*" \
            -not -path "*/.next/*" \
            -not -path "*/coverage/*" \
            -not -path "*/.nyc_output/*" \
            -not -path "*/.cache/*" \
            -not -path "*/tmp/*" \
            -not -path "*/temp/*"
    fi
}

echo -e "${GREEN}🗺️  JavaScript Project Mapper${NC}"
echo -e "${BLUE}Analyzing project: ${PROJECT_DIR}${NC}"
echo -e "${BLUE}Output file: ${OUTPUT_FILE}${NC}"

# Check git status
if is_git_repo; then
    echo -e "${GREEN}✓ Git repository detected - honoring .gitignore${NC}"
else
    echo -e "${YELLOW}⚠ No git repository - using fallback ignore patterns${NC}"
fi
echo ""

# Start the output file
cat > "$OUTPUT_FILE" << 'EOF'
# Project Structure Map

This file contains a comprehensive map of the JavaScript project structure, including file organization, modules, classes, functions, and key relationships.

## Table of Contents
1. [Project Overview](#project-overview)
2. [File Structure](#file-structure)
3. [Dependencies](#dependencies)
4. [Modules & Classes](#modules--classes)
5. [Functions & Methods](#functions--methods)
6. [Global Variables & Constants](#global-variables--constants)
7. [Event Listeners & DOM Interactions](#event-listeners--dom-interactions)
8. [API Endpoints & External Calls](#api-endpoints--external-calls)

EOF

echo -e "${YELLOW}📊 Generating project overview...${NC}"

# Project Overview
echo "## Project Overview" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Count files and get basic stats
JS_FILES=$(get_tracked_files ".js" | wc -l)
HTML_FILES=$(get_tracked_files ".html" | wc -l)
CSS_FILES=$(get_tracked_files ".css" | wc -l)

echo "- **JavaScript Files:** $JS_FILES" >> "$OUTPUT_FILE"
echo "- **HTML Files:** $HTML_FILES" >> "$OUTPUT_FILE"
echo "- **CSS Files:** $CSS_FILES" >> "$OUTPUT_FILE"
echo "- **Generated:** $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo -e "${YELLOW}📁 Mapping file structure...${NC}"

# File Structure
echo "## File Structure" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo '```' >> "$OUTPUT_FILE"

# Generate tree structure for relevant files
if is_git_repo; then
    # Use git ls-files for accurate gitignore respect
    (cd "$PROJECT_DIR" && git ls-files | grep -E "\.(js|html|css|json|md)$" | sort)
else
    # Fallback method
    find "$PROJECT_DIR" \( -name "*.js" -o -name "*.html" -o -name "*.css" -o -name "*.json" -o -name "*.md" \) \
        -not -path "*/node_modules/*" \
        -not -path "*/.git/*" \
        -not -path "*/dist/*" \
        -not -path "*/build/*" \
        -not -path "*/.next/*" \
        -not -path "*/coverage/*" \
        -not -path "*/.nyc_output/*" \
        -not -path "*/.cache/*" \
        -not -path "*/tmp/*" \
        -not -path "*/temp/*" | \
        sed "s|^$PROJECT_DIR/||" | sort
fi | \
    awk '
    BEGIN { 
        # Track which directories we have already printed
        split("", printed_dirs)
    }
    {
        # Split the path into components
        split($0, parts, "/")
        
        # Build and print directory structure
        path = ""
        for (i = 1; i < length(parts); i++) {
            if (path == "") {
                path = parts[i]
            } else {
                path = path "/" parts[i]
            }
            
            # Only print each directory once
            if (!(path in printed_dirs)) {
                # Print appropriate indentation
                for (j = 1; j < i; j++) printf "  "
                printf "%s/\n", parts[i]
                printed_dirs[path] = 1
            }
        }
        
        # Print the file with proper indentation
        for (j = 1; j < length(parts); j++) printf "  "
        print parts[length(parts)]
    }' >> "$OUTPUT_FILE"

echo '```' >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo -e "${YELLOW}📦 Analyzing dependencies...${NC}"

# Dependencies
echo "## Dependencies" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Check for package.json
if [ -f "$PROJECT_DIR/package.json" ]; then
    echo "### NPM Dependencies" >> "$OUTPUT_FILE"
    echo '```json' >> "$OUTPUT_FILE"
    if command -v jq >/dev/null 2>&1; then
        jq -r '.dependencies // {} | to_entries[] | "  \(.key): \(.value)"' "$PROJECT_DIR/package.json" 2>/dev/null >> "$OUTPUT_FILE" || \
        grep -A 20 '"dependencies"' "$PROJECT_DIR/package.json" | grep -E '^\s*"' | head -20 >> "$OUTPUT_FILE"
    else
        grep -A 20 '"dependencies"' "$PROJECT_DIR/package.json" | grep -E '^\s*"' | head -20 >> "$OUTPUT_FILE"
    fi
    echo '```' >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
fi

# Analyze import/require statements
echo "### Module Imports" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

get_tracked_files ".js" | while read file; do
    if [ -f "$file" ] && [ -s "$file" ]; then
        rel_path=$(echo "$file" | sed "s|^$PROJECT_DIR/||")
        imports=$(grep -E "^[[:space:]]*(import|const.*require|let.*require|var.*require)" "$file" 2>/dev/null | head -10)
        if [ -n "$imports" ]; then
            echo "**$rel_path:**" >> "$OUTPUT_FILE"
            echo '```javascript' >> "$OUTPUT_FILE"
            echo "$imports" >> "$OUTPUT_FILE"
            echo '```' >> "$OUTPUT_FILE"
            echo "" >> "$OUTPUT_FILE"
        fi
    fi
done

# Check HTML files for script tags
get_tracked_files ".html" | while read file; do
    if [ -f "$file" ] && [ -s "$file" ]; then
        rel_path=$(echo "$file" | sed "s|^$PROJECT_DIR/||")
        scripts=$(grep -E "<script.*src=" "$file" 2>/dev/null | head -10)
        if [ -n "$scripts" ]; then
            echo "**$rel_path (Script Tags):**" >> "$OUTPUT_FILE"
            echo '```html' >> "$OUTPUT_FILE"
            echo "$scripts" >> "$OUTPUT_FILE"
            echo '```' >> "$OUTPUT_FILE"
            echo "" >> "$OUTPUT_FILE"
        fi
    fi
done

echo -e "${YELLOW}🏗️  Analyzing modules and classes...${NC}"

# Modules & Classes
echo "## Modules & Classes" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

get_tracked_files ".js" | while read file; do
    if [ -f "$file" ] && [ -s "$file" ]; then
        rel_path=$(echo "$file" | sed "s|^$PROJECT_DIR/||")
        
        # Find class definitions
        classes=$(grep -n "^[[:space:]]*class\|^[[:space:]]*export.*class\|^[[:space:]]*export default class" "$file" 2>/dev/null)
        
        # Find function constructors (older style)
        constructors=$(grep -n "^[[:space:]]*function.*[A-Z]" "$file" 2>/dev/null | head -5)
        
        # Find object literals that might be modules
        modules=$(grep -n "^[[:space:]]*const.*=.*{$\|^[[:space:]]*let.*=.*{$\|^[[:space:]]*var.*=.*{$" "$file" 2>/dev/null | head -5)
        
        if [ -n "$classes" ] || [ -n "$constructors" ] || [ -n "$modules" ]; then
            echo "### $rel_path" >> "$OUTPUT_FILE"
            echo "" >> "$OUTPUT_FILE"
            
            if [ -n "$classes" ]; then
                echo "**Classes:**" >> "$OUTPUT_FILE"
                echo '```javascript' >> "$OUTPUT_FILE"
                echo "$classes" | sed 's/^[0-9]*://' >> "$OUTPUT_FILE"
                echo '```' >> "$OUTPUT_FILE"
                echo "" >> "$OUTPUT_FILE"
            fi
            
            if [ -n "$constructors" ]; then
                echo "**Constructor Functions:**" >> "$OUTPUT_FILE"
                echo '```javascript' >> "$OUTPUT_FILE"
                echo "$constructors" | sed 's/^[0-9]*://' >> "$OUTPUT_FILE"
                echo '```' >> "$OUTPUT_FILE"
                echo "" >> "$OUTPUT_FILE"
            fi
            
            if [ -n "$modules" ]; then
                echo "**Module Objects:**" >> "$OUTPUT_FILE"
                echo '```javascript' >> "$OUTPUT_FILE"
                echo "$modules" | sed 's/^[0-9]*://' >> "$OUTPUT_FILE"
                echo '```' >> "$OUTPUT_FILE"
                echo "" >> "$OUTPUT_FILE"
            fi
        fi
    fi
done

echo -e "${YELLOW}⚙️  Analyzing functions and methods...${NC}"

# Functions & Methods
echo "## Functions & Methods" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

get_tracked_files ".js" | while read file; do
    if [ -f "$file" ] && [ -s "$file" ]; then
        rel_path=$(echo "$file" | sed "s|^$PROJECT_DIR/||")
        
        # Find function declarations and expressions
        functions=$(grep -n "^[[:space:]]*function\|^[[:space:]]*const.*=.*function\|^[[:space:]]*let.*=.*function\|^[[:space:]]*var.*=.*function\|^[[:space:]]*const.*=.*=>\|^[[:space:]]*let.*=.*=>\|^[[:space:]]*var.*=.*=>" "$file" 2>/dev/null | head -15)
        
        # Find method definitions (inside objects/classes)
        methods=$(grep -n "^[[:space:]]*[a-zA-Z_$][a-zA-Z0-9_$]*[[:space:]]*([^)]*)[[:space:]]*{" "$file" 2>/dev/null | head -10)
        
        if [ -n "$functions" ] || [ -n "$methods" ]; then
            echo "### $rel_path" >> "$OUTPUT_FILE"
            echo "" >> "$OUTPUT_FILE"
            
            if [ -n "$functions" ]; then
                echo "**Functions:**" >> "$OUTPUT_FILE"
                echo '```javascript' >> "$OUTPUT_FILE"
                echo "$functions" | sed 's/^[0-9]*://' >> "$OUTPUT_FILE"
                echo '```' >> "$OUTPUT_FILE"
                echo "" >> "$OUTPUT_FILE"
            fi
            
            if [ -n "$methods" ]; then
                echo "**Methods:**" >> "$OUTPUT_FILE"
                echo '```javascript' >> "$OUTPUT_FILE"
                echo "$methods" | sed 's/^[0-9]*://' >> "$OUTPUT_FILE"
                echo '```' >> "$OUTPUT_FILE"
                echo "" >> "$OUTPUT_FILE"
            fi
        fi
    fi
done

echo -e "${YELLOW}🌐 Analyzing global variables and constants...${NC}"

# Global Variables & Constants
echo "## Global Variables & Constants" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

get_tracked_files ".js" | while read file; do
    if [ -f "$file" ] && [ -s "$file" ]; then
        rel_path=$(echo "$file" | sed "s|^$PROJECT_DIR/||")
        
        # Find top-level variable declarations
        globals=$(grep -n "^const\|^let\|^var" "$file" 2>/dev/null | head -10)
        
        if [ -n "$globals" ]; then
            echo "### $rel_path" >> "$OUTPUT_FILE"
            echo '```javascript' >> "$OUTPUT_FILE"
            echo "$globals" | sed 's/^[0-9]*://' >> "$OUTPUT_FILE"
            echo '```' >> "$OUTPUT_FILE"
            echo "" >> "$OUTPUT_FILE"
        fi
    fi
done

echo -e "${YELLOW}🎯 Analyzing event listeners and DOM interactions...${NC}"

# Event Listeners & DOM Interactions
echo "## Event Listeners & DOM Interactions" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

get_tracked_files ".js" | while read file; do
    if [ -f "$file" ] && [ -s "$file" ]; then
        rel_path=$(echo "$file" | sed "s|^$PROJECT_DIR/||")
        
        # Find event listeners and DOM methods
        dom_interactions=$(grep -n "addEventListener\|removeEventListener\|getElementById\|querySelector\|getElementsBy\|document\.\|window\." "$file" 2>/dev/null | head -10)
        
        if [ -n "$dom_interactions" ]; then
            echo "### $rel_path" >> "$OUTPUT_FILE"
            echo '```javascript' >> "$OUTPUT_FILE"
            echo "$dom_interactions" | sed 's/^[0-9]*://' >> "$OUTPUT_FILE"
            echo '```' >> "$OUTPUT_FILE"
            echo "" >> "$OUTPUT_FILE"
        fi
    fi
done

echo -e "${YELLOW}🌍 Analyzing API endpoints and external calls...${NC}"

# API Endpoints & External Calls
echo "## API Endpoints & External Calls" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

get_tracked_files ".js" | while read file; do
    if [ -f "$file" ] && [ -s "$file" ]; then
        rel_path=$(echo "$file" | sed "s|^$PROJECT_DIR/||")
        
        # Find fetch calls, XMLHttpRequest, and URLs
        api_calls=$(grep -n "fetch(\|XMLHttpRequest\|axios\|\.get(\|\.post(\|\.put(\|\.delete(\|http://\|https://" "$file" 2>/dev/null | head -10)
        
        if [ -n "$api_calls" ]; then
            echo "### $rel_path" >> "$OUTPUT_FILE"
            echo '```javascript' >> "$OUTPUT_FILE"
            echo "$api_calls" | sed 's/^[0-9]*://' >> "$OUTPUT_FILE"
            echo '```' >> "$OUTPUT_FILE"
            echo "" >> "$OUTPUT_FILE"
        fi
    fi
done

# Add footer with usage instructions
cat >> "$OUTPUT_FILE" << 'EOF'

---

## Usage Instructions

This file should be included in your project's CLAUDE.md or similar documentation file. When working with Claude on this project, reference this map to provide context about:

- File organization and structure
- Available modules and classes
- Function and method signatures
- Dependencies and imports
- DOM interaction patterns
- API endpoints and external services

**Regenerate this file when:**
- Adding new modules or significant features
- Restructuring the project
- Adding new dependencies
- Changing core architecture

**Command to regenerate:**
```bash
./js-project-mapper.sh [project-directory] [output-file]
```

EOF

echo ""
echo -e "${GREEN}✅ Project mapping complete!${NC}"
echo -e "${BLUE}📄 Output saved to: ${OUTPUT_FILE}${NC}"
echo ""
echo -e "${YELLOW}💡 Tip: Include this file in your CLAUDE.md for better AI assistance${NC}"
echo ""

# Make the script executable
chmod +x "$0"
