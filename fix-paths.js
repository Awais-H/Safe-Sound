const fs = require('fs');
const path = require('path');

function fixHTML(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Fix href and src attributes
    content = content.replace(/href="\/_next/g, 'href="./_next');
    content = content.replace(/src="\/_next/g, 'src="./_next');

    // Fix paths inside inline scripts and JSON
    content = content.replace(/\\\/_next/g, './_next');
    content = content.replace(/"\/\_next/g, '"./_next');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✓ Fixed:', filePath);
}

// Fix all HTML files in out directory
const outDir = './out';
fs.readdirSync(outDir).forEach(file => {
    if (file.endsWith('.html')) {
        fixHTML(path.join(outDir, file));
    }
});

console.log('✓ All paths fixed!');