# Mobile App Setup Guide

Job Hunt Manager is now available as both a Progressive Web App (PWA) and native mobile apps for iOS and Android!

## ✅ What's Been Set Up

### PWA (Progressive Web App)
- ✅ Service worker with offline support
- ✅ Web app manifest
- ✅ Install prompt support
- ✅ Smart caching strategies
- ✅ iOS meta tags for web app mode

### Capacitor (Native Mobile Apps)
- ✅ iOS project configured
- ✅ Android project configured
- ✅ Build script for copying assets
- ✅ npm scripts for easy workflows

---

## 📱 Testing the PWA

### 1. Deploy to HTTPS
PWAs require HTTPS. Deploy to a hosting service:

**Quick Deploy Options:**
```bash
# Vercel (recommended - easiest)
npx vercel --prod

# Netlify
npx netlify deploy --prod

# GitHub Pages
git push origin main
# Enable GitHub Pages in repo settings
```

### 2. Test on Mobile Device

**iOS (iPhone/iPad):**
1. Open Safari and navigate to your app URL
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. The app will install and appear on your home screen

**Android:**
1. Open Chrome and navigate to your app URL
2. Look for the "Install" prompt at the bottom
3. Tap "Install" to add to home screen
4. Or: Menu (3 dots) → "Add to Home screen"

### 3. Test Offline Mode
1. Install the app on your device
2. Open the app (works online)
3. Turn on Airplane mode
4. Open the app again - it should still work! 🎉

---

## 📲 Building Native Mobile Apps

### Prerequisites

**For iOS:**
- macOS computer (required for iOS development)
- Xcode installed from Mac App Store
- Apple Developer account (free for testing, $99/year for App Store)

**For Android:**
- Android Studio installed (Mac, Windows, or Linux)
- Java Development Kit (JDK) installed
- Android SDK (comes with Android Studio)

### Build & Run Commands

```bash
# Build and sync web assets to native projects
npm run cap:sync

# Open in Xcode (iOS)
npm run cap:ios

# Open in Android Studio (Android)
npm run cap:android

# Build and run on iOS device/simulator
npm run cap:run:ios

# Build and run on Android device/emulator
npm run cap:run:android
```

### Manual Steps

#### iOS Development:
1. Run `npm run cap:ios` to open Xcode
2. In Xcode:
   - Select a target device (simulator or physical device)
   - Click the Play button to build and run
   - For physical device: Connect iPhone, select it, and build
3. First time: You may need to trust your developer certificate on the device

#### Android Development:
1. Run `npm run cap:android` to open Android Studio
2. Wait for Gradle sync to complete (first time takes 5-10 minutes)
3. In Android Studio:
   - Select a target device (emulator or physical device)
   - Click the Run button (green triangle)
   - For physical device: Enable USB debugging in Developer Options

---

## 🔄 Development Workflow

### When You Update the Web App:

```bash
# 1. Make changes to your HTML/CSS/JS files
# 2. Rebuild and sync to mobile projects
npm run cap:sync

# 3. The native apps will automatically reload with your changes
```

### Project Structure:
```
resume-tool/
├── www/                    # Capacitor web assets (generated)
│   ├── index.html         # Copied from app-responsive.html
│   ├── jobs-responsive.css
│   ├── components/
│   └── js/
├── ios/                   # iOS native project (generated)
│   └── App/
├── android/               # Android native project (generated)
│   └── app/
├── scripts/
│   └── build-capacitor.sh # Build script
├── capacitor.config.json  # Capacitor configuration
├── manifest.json          # PWA manifest
└── service-worker.js      # PWA service worker
```

---

## 🎨 Customization

### App Icons

Currently using existing extension icons. For production, create dedicated app icons:

**Sizes Needed:**
- **iOS:** 1024x1024 PNG (App Store)
- **Android:** 512x512 PNG (Play Store)
- **PWA:** 192x192 and 512x512 PNG

**Generate icons automatically:**
```bash
# Install icon generator
npm install -g @capacitor/assets

# Generate all sizes from one source image
npx @capacitor/assets generate --iconSource icon.png
```

### Splash Screens

Configured in `capacitor.config.json`:
- Background color: `#3498db` (app blue)
- Duration: 2 seconds
- Spinner shown during load

To customize:
1. Edit `capacitor.config.json` → `plugins.SplashScreen`
2. Add custom splash images to iOS/Android projects

### App Name & ID

Currently:
- App Name: "Job Hunt Manager"
- App ID: `com.jobhuntmanager.app`

To change:
1. Edit `capacitor.config.json`
2. Re-sync: `npm run cap:sync`

---

## 🚀 Publishing to App Stores

### iOS App Store

1. **Prepare:**
   - Join Apple Developer Program ($99/year)
   - Configure signing in Xcode (Team & Certificates)
   - Create app record in App Store Connect

2. **Build for release:**
   - In Xcode: Product → Archive
   - Upload to App Store Connect
   - Submit for review

3. **Requirements:**
   - Privacy policy URL (required)
   - App screenshots (various sizes)
   - App description and keywords
   - App icon (1024x1024)

### Google Play Store

1. **Prepare:**
   - Create Google Play Developer account ($25 one-time)
   - Create app record in Play Console
   - Generate signing key

2. **Build for release:**
   - In Android Studio: Build → Generate Signed Bundle/APK
   - Choose "Android App Bundle" (recommended)
   - Upload to Play Console
   - Submit for review

3. **Requirements:**
   - Privacy policy URL (required)
   - App screenshots (phone, tablet, etc.)
   - Feature graphic (1024x500)
   - App icon (512x512)

---

## 🐛 Troubleshooting

### iOS Issues

**"CocoaPods not installed"**
```bash
sudo gem install cocoapods
cd ios && pod install
```

**"Xcode plugin loading failed"**
```bash
xcodebuild -runFirstLaunch
```

**Simulator not loading**
- Open Xcode preferences → Locations
- Ensure Command Line Tools is set

### Android Issues

**"Java Runtime not found"**
- Install JDK 11 or newer
- Set JAVA_HOME environment variable

**"Gradle sync failed"**
- In Android Studio: File → Invalidate Caches → Restart
- Or: `cd android && ./gradlew clean`

**Build fails**
- Update Android SDK in Android Studio
- Ensure targetSdkVersion is compatible (check build.gradle)

### PWA Issues

**Install prompt not showing**
- PWA requires HTTPS (except localhost)
- Check service worker registration in console
- Chrome DevTools → Application → Manifest (check for errors)

**Offline mode not working**
- Check service worker in Chrome DevTools → Application
- Look for caching errors in console
- Try: Unregister service worker and reload

---

## 📊 Current Status

### ✅ Completed
- PWA manifest and service worker
- iOS project setup
- Android project setup
- Build scripts and npm commands
- Basic Capacitor configuration

### 🔨 Ready for Development
- Open in Xcode/Android Studio
- Build and run on simulators/emulators
- Test on physical devices

### 📋 TODO for Production
- [ ] Generate production app icons (1024x1024, 512x512)
- [ ] Create app screenshots for stores
- [ ] Set up code signing (iOS & Android)
- [ ] Configure push notifications (if needed)
- [ ] Add native plugins (camera, share, etc.)
- [ ] Test on multiple device sizes
- [ ] Performance optimization for mobile
- [ ] Submit to app stores

---

## 📚 Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [iOS App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Store Guidelines](https://play.google.com/console/about/guides/releasewithconfidence/)

---

## 🎉 Quick Start

```bash
# Test PWA locally
npm run serve
# Open http://localhost:3000 in browser

# Build for Capacitor
npm run cap:build

# Open in Xcode
npm run cap:ios

# Open in Android Studio
npm run cap:android
```

**Questions?** Check the troubleshooting section above or refer to the official Capacitor docs.
