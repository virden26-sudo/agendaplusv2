const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function run() {
  const { default: pngToIco } = await import('png-to-ico');
  
  const inputPath = 'assets/icon.png';
  const outputPath = 'assets/appIcon.ico';
  const squarePngPath = 'assets/icon-square.png';

  try {
    // 1. Make it square and resize to 512x512 first to ensure quality
    await sharp(inputPath)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .toFile(squarePngPath);

    console.log('Created square PNG for conversion');

    // 2. Convert to ICO
    const buf = await pngToIco(squarePngPath);
    fs.writeFileSync(outputPath, buf);
    console.log('Successfully created assets/appIcon.ico');
    
    // Clean up temporary square png
    if (fs.existsSync(squarePngPath)) {
        fs.unlinkSync(squarePngPath);
    }
  } catch (err) {
    console.error('Error during ico generation:', err);
  }
}

run();
