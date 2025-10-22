/* eslint-env node */
const fs = require('fs');
const path = require('path');

// Create a minimal 1x1 PNG image (base64 encoded)
const minimalPNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

const outputDir = path.join(__dirname, 'test-images');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create 4 test images
fs.writeFileSync(path.join(outputDir, 'before1.png'), minimalPNG);
fs.writeFileSync(path.join(outputDir, 'before2.png'), minimalPNG);
fs.writeFileSync(path.join(outputDir, 'after1.png'), minimalPNG);
fs.writeFileSync(path.join(outputDir, 'after2.png'), minimalPNG);

console.log('Test images created successfully');
