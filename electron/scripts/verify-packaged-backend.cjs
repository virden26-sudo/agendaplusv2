const fs = require('node:fs');
const path = require('node:path');

// electron-builder excludes node_modules at the root of an extraResources source.
// Check the actual package so a build cannot succeed with an unusable sidecar.
module.exports = async context => {
  const resources = context.electronPlatformName === 'darwin'
    ? path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents', 'Resources')
    : path.join(context.appOutDir, 'resources');
  const backend = path.join(resources, 'backend');
  for (const file of ['server.js', 'node_modules/next/package.json', '.next-server/BUILD_ID']) {
    if (!fs.existsSync(path.join(backend, file))) throw new Error(`Packaged backend is incomplete: ${file}`);
  }
  console.log('Packaged backend entry, Next.js runtime and build manifest are present.');
};
