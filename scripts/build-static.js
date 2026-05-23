const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, '..', 'src', 'app', 'api');
const tempApiPath = path.join(__dirname, '..', 'src', 'app', '_api');

try {
  console.log('Moving API routes out of src/app to allow static export...');
  if (fs.existsSync(apiPath)) {
    fs.renameSync(apiPath, tempApiPath);
  }

  console.log('Running Next.js build...');
  execSync('npx cross-env NODE_ENV=production next build --webpack', { stdio: 'inherit' });

  console.log('Build successful!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
} finally {
  console.log('Moving API routes back...');
  if (fs.existsSync(tempApiPath)) {
    fs.renameSync(tempApiPath, apiPath);
  }
}
