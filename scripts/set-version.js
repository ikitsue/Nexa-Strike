const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const frontendPublicPath = path.join(root, 'frontend', 'public', 'version.js');
const desktopPublicPath = path.join(root, 'desktop', 'public', 'version.js');
const desktopSourcePath = path.join(root, 'desktop', 'src', 'version.js');
const versionFilePath = path.join(root, 'version.txt');
const packageDirectories = ['', 'frontend', 'desktop'];

function getReleaseVersion(shouldBump) {
  try {
    if (fs.existsSync(versionFilePath)) {
      const currentVersion = fs.readFileSync(versionFilePath, 'utf8').trim();
      if (currentVersion) {
        if (!shouldBump) {
          return currentVersion;
        }

        const [major, minor, patch] = currentVersion.split('.').map(Number);
        return `${major}.${minor}.${patch + 1}`;
      }
    }
  } catch {}

  return '1.2.0';
}

const version = getReleaseVersion(process.argv.includes('--bump'));

function writeVersionFile(filePath) {
  const content = `window.__APP_VERSION__ = '${version}';\n`;
  fs.writeFileSync(filePath, content, 'utf8');
}

writeVersionFile(frontendPublicPath);
writeVersionFile(desktopPublicPath);
writeVersionFile(desktopSourcePath);

for (const directory of packageDirectories) {
  const packagePath = path.join(root, directory, 'package.json');
  const lockPath = path.join(root, directory, 'package-lock.json');
  const packageContents = fs.readFileSync(packagePath, 'utf8');
  const packageData = JSON.parse(packageContents);
  packageData.version = version;

  if (directory === '') {
    packageData.description = packageData.description.replace(
      /(\*\*Version\*\*:\s*)\d+\.\d+\.\d+/,
      `$1${version}`
    );
  }

  const packageLineEnding = packageContents.includes('\r\n') ? '\r\n' : '\n';
  fs.writeFileSync(
    packagePath,
    `${JSON.stringify(packageData, null, 2).replace(/\n/g, packageLineEnding)}${packageLineEnding}`,
    'utf8'
  );

  const lockContents = fs.readFileSync(lockPath, 'utf8');
  const lockData = JSON.parse(lockContents);
  lockData.version = version;
  if (lockData.packages?.['']) {
    lockData.packages[''].version = version;
  }

  const lockLineEnding = lockContents.includes('\r\n') ? '\r\n' : '\n';
  fs.writeFileSync(
    lockPath,
    `${JSON.stringify(lockData, null, 2).replace(/\n/g, lockLineEnding)}${lockLineEnding}`,
    'utf8'
  );
}

fs.writeFileSync(versionFilePath, version, 'utf8');
console.log(`Version set to ${version}`);
