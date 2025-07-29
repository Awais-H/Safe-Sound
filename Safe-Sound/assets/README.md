# Extension Icons

This directory contains the icon files for the Chrome extension:

- `icon16.png` - 16x16 pixels
- `icon48.png` - 48x48 pixels  
- `icon128.png` - 128x128 pixels

## Creating Icons

The icons are automatically generated using the script `scripts/create-icons.js`. To recreate them:

```bash
npm run create-icons
```

The icons are simple colored squares with "SS" (Safe Sound) text in white. You can replace these with custom icons by:

1. Creating your own PNG files with the same names
2. Or modifying the `scripts/create-icons.js` script to generate different designs

## Icon Specifications

- **Format**: PNG
- **Sizes**: 16x16, 48x48, and 128x128 pixels
- **Color**: Blue background (#4F46E5) with white "SS" text
- **Style**: Rounded rectangle with bold text 