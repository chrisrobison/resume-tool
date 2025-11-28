# Extension Icons

This directory should contain the extension icons in PNG format.

## Required Sizes

The following icon sizes are required for the Chrome extension:

- `icon16.png` - 16x16 pixels (toolbar icon, small displays)
- `icon32.png` - 32x32 pixels (toolbar icon on retina displays)
- `icon48.png` - 48x48 pixels (extension management page)
- `icon128.png` - 128x128 pixels (Chrome Web Store, installation dialog)

## Design Guidelines

### Visual Style
- Use the Job Hunt Manager brand color: **#3498db** (blue)
- Include a recognizable symbol (briefcase 💼, bookmark 🔖, or folder 📁)
- Ensure the icon is legible at 16x16 pixels
- Use a simple, clean design with minimal details

### Technical Requirements
- Format: PNG with transparency
- Color space: sRGB
- Bit depth: 24-bit (RGB) or 32-bit (RGBA)
- Transparent background recommended
- Avoid gradients at small sizes

### Recommended Icon Concepts

1. **Briefcase Icon**
   - Simple briefcase outline in blue
   - Optional checkmark or star overlay
   - Clean, professional look

2. **Bookmark Icon**
   - Bookmark ribbon shape in blue
   - Optional "+" or checkmark
   - Friendly, approachable feel

3. **Folder with Star**
   - Blue folder icon
   - Star or bookmark symbol
   - Organizational theme

## Creating Icons

### Option 1: Design Tools
Use professional design tools like:
- Figma (recommended for web)
- Adobe Illustrator
- Sketch
- Affinity Designer

### Option 2: Online Tools
Quick icon generation:
- [Favicon.io](https://favicon.io/) - Generate from text or emoji
- [IconGenerator](https://icon-generator.net/) - AI-powered icon generation
- [RealFaviconGenerator](https://realfavicongenerator.net/) - Multi-platform icons

### Option 3: Emoji to Icon
Quick placeholder using emoji:
```bash
# macOS/Linux with ImageMagick
convert -size 128x128 xc:transparent -font "Apple Color Emoji" \
  -pointsize 110 -gravity center -annotate +0+0 "💼" icon128.png
```

## Temporary Placeholders

Until proper icons are designed, you can:

1. **Use colored squares** (for testing only):
   - Create solid #3498db squares in each size
   - Add "JHM" text overlay

2. **Use emoji** (acceptable for MVP):
   - Briefcase emoji 💼 as temporary icon
   - Works across platforms
   - Should be replaced before public release

3. **Use simple SVG converted to PNG**:
   - Design simple icon in SVG
   - Convert to PNG at required sizes
   - Ensures consistency across sizes

## Current Status

⚠️ **Placeholder icons needed!**

The extension currently references these icon files, but they don't exist yet:
- [ ] icon16.png
- [ ] icon32.png
- [ ] icon48.png
- [ ] icon128.png

**Next Steps:**
1. Create temporary placeholders for testing
2. Design professional icons for production
3. Test icons in browser at all sizes
4. Replace placeholders before Chrome Web Store submission

## Useful Resources

- [Chrome Extension Icon Guidelines](https://developer.chrome.com/docs/webstore/images/)
- [Material Design Icons](https://materialdesignicons.com/)
- [The Noun Project](https://thenounproject.com/) - Icon inspiration
- [Heroicons](https://heroicons.com/) - Open-source icons
