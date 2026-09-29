const fs = require('fs');
const path = require('path');

const src = 'C:\\Users\\LENOVO\\.gemini\\antigravity-ide\\brain\\fcf0151e-db8d-4abe-ba2e-b88d46404658\\.user_uploaded\\media_1790654521055.jpg';
const destDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy source as icons
const targets = [
  'icon-192x192.png',
  'icon-512x512.png',
  'apple-touch-icon.png',
  'app-logo.png',
  'icon.png'
];

targets.forEach(t => {
  const destFile = path.join(destDir, t);
  fs.copyFileSync(src, destFile);
  console.log(`Copied ${t}`);
});

// Also copy to public/app-logo.png and public/favicon.ico
fs.copyFileSync(src, path.join(__dirname, '..', 'public', 'app-logo.png'));
fs.copyFileSync(src, path.join(__dirname, '..', 'public', 'icon.png'));
console.log('All icons copied successfully.');
