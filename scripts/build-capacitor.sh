#!/bin/bash
# build-capacitor.sh - Build script for Capacitor mobile apps
# Copies web app files to www directory for Capacitor

echo "🔨 Building Capacitor app..."

# Create www directory
mkdir -p www

# Copy main HTML file (renamed to index.html for mobile)
cp app-responsive.html www/index.html

# Copy CSS
cp jobs-responsive.css www/

# Copy logo and icons
cp logo.svg www/
mkdir -p www/extension
cp -r extension/icons www/extension/

# Copy JavaScript services and components
mkdir -p www/js/services
mkdir -p www/components

cp -r js/services/*.js www/js/services/
cp -r components/*.js www/components/

# Copy core JavaScript files
cp js/*.js www/js/ 2>/dev/null || true

# Copy manifest and service worker
cp manifest.json www/
cp service-worker.js www/

# Update paths in index.html for Capacitor
# (Capacitor serves from root of www, so paths are already correct)

echo "✅ Build complete! Files copied to www/"
echo ""
echo "Next steps:"
echo "1. npx cap sync           # Sync web assets to native projects"
echo "2. npx cap open ios       # Open in Xcode"
echo "3. npx cap open android   # Open in Android Studio"
