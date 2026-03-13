# Extension Icons

This directory contains the icons for the Real-Time Video Translator Chrome extension.

## Required Icons

You need to create or add the following icon files:

- **icon16.png** - 16x16 pixels (toolbar icon, small display)
- **icon48.png** - 48x48 pixels (extension management page)
- **icon128.png** - 128x128 pixels (Chrome Web Store, installation)

## Design Guidelines

### Icon Design Recommendations:

1. **Theme**: Translation/language-related imagery
   - Globe with speech bubbles
   - Text/subtitle symbol
   - Translation arrows
   - Video + language combination

2. **Colors**:
   - Primary: Blue/Purple gradient (matches popup header)
   - Accent: Green (for active state)
   - Keep it simple and recognizable

3. **Style**:
   - Modern, flat design
   - Clear at small sizes (16x16)
   - Consistent across all sizes
   - Transparent background (PNG with alpha channel)

## Creating Icons

### Option 1: Use an Online Icon Generator

- [Favicon.io](https://favicon.io/)
- [Canva](https://www.canva.com/)
- [Figma](https://www.figma.com/)

### Option 2: Use Design Software

- Adobe Illustrator/Photoshop
- Inkscape (free)
- GIMP (free)

### Option 3: Use Free Icon Resources

- [Material Icons](https://fonts.google.com/icons)
- [Font Awesome](https://fontawesome.com/)
- [Feather Icons](https://feathericons.com/)
- [Heroicons](https://heroicons.com/)

## Sample SVG Icon Code

Here's a simple SVG you can convert to PNG:

```svg
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <!-- Background circle -->
  <circle cx="64" cy="64" r="56" fill="url(#gradient)"/>

  <!-- Gradient definition -->
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Translation symbol (text lines) -->
  <rect x="30" y="45" width="68" height="8" rx="4" fill="white" opacity="0.9"/>
  <rect x="30" y="60" width="52" height="8" rx="4" fill="white" opacity="0.7"/>
  <rect x="30" y="75" width="60" height="8" rx="4" fill="white" opacity="0.9"/>
</svg>
```

## Converting SVG to PNG

### Using Online Tools:

1. [CloudConvert](https://cloudconvert.com/svg-to-png)
2. [SVG2PNG](https://svgtopng.com/)

### Using Command Line:

```bash
# Using Inkscape
inkscape -w 128 -h 128 icon.svg -o icon128.png
inkscape -w 48 -h 48 icon.svg -o icon48.png
inkscape -w 16 -h 16 icon.svg -o icon16.png

# Using ImageMagick
convert -density 300 -resize 128x128 icon.svg icon128.png
convert -density 300 -resize 48x48 icon.svg icon48.png
convert -density 300 -resize 16x16 icon.svg icon16.png
```

## Placeholder Icons

If you need placeholder icons quickly, you can use these emoji-based approach:

1. Take a screenshot of these emojis at different sizes:
   - 🌐 (globe)
   - 💬 (speech bubble)
   - 📝 (memo)
   - 🎬 (clapper board)

2. Or generate simple colored squares with text:
   - Create a 128x128 purple square
   - Add white "VT" text (Video Translator)
   - Save as PNG

## Testing Your Icons

After adding your icons:

1. Load the extension in Chrome (`chrome://extensions/`)
2. Check the toolbar icon (16x16)
3. Check the extension management page (48x48)
4. Verify all sizes look clear and recognizable

## Notes

- Icons must be PNG format with transparent background
- File names must match exactly: `icon16.png`, `icon48.png`, `icon128.png`
- Icons should be optimized (compressed) for faster loading
- Consider creating different icons for active/inactive states (future enhancement)

---

**Need help?** Create an issue on GitHub or refer to the [Chrome Extension Icon Guidelines](https://developer.chrome.com/docs/extensions/mv3/user_interface/#icons)
