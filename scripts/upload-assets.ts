const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

type RunCommand = (command: string, args: string[]) => Buffer;

const runCommand: RunCommand = (command, args) => execFileSync(command, args, {
  maxBuffer: 128 * 1024 * 1024,
});

const contentTypes: Record<string, string> = {
  '.css': 'text/css',
  '.gif': 'image/gif',
  '.html': 'text/html',
  '.ico': 'image/vnd.microsoft.icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.md': 'text/markdown',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function uploadAssets(
  archive: string,
  bucket: string,
  name: string,
  release: boolean,
  run: RunCommand = runCommand,
) {
  if (!bucket || !name || name.includes('/') || name === '.' || name === '..') {
    throw new Error('Invalid bucket, asset version or branch name');
  }
  if (!release && !['feat-', 'feature-', 'fix-', 'master'].some((prefix) => name.startsWith(prefix))) {
    throw new Error('Invalid CI branch prefix');
  }

  const prefix = `public-portal/public-web-assets/${release ? 'release-' : ''}${name}/public/`;
  const tagging = release ? 'promote=YES' : `lifecycle_subject=${/^(feat-|feature-|fix-)/.test(name)}`;
  const aws = (...args: string[]) => run('aws', ['s3api', ...args, '--no-cli-pager']);
  const entries = run('unzip', ['-Z', '-1', archive]).toString('utf8').split('\n');
  const files = entries.filter((entry) => entry.startsWith('public/') && !entry.endsWith('/'));
  if (files.length === 0) throw new Error('Archive contains no public assets');

  const keys = new Set<string>();
  for (const file of files) {
    if (path.posix.normalize(file) !== file || file.split('/').includes('..') || /[\x00-\x1f*?[\]]/.test(file)) {
      throw new Error(`Invalid asset path: ${file}`);
    }
    const key = prefix + file.slice('public/'.length);
    if (keys.has(key)) throw new Error(`Duplicate asset path: ${file}`);
    keys.add(key);
  }
  const versionKey = `${prefix}version.md`;
  if (keys.has(versionKey)) throw new Error('Archive contains reserved public/version.md');
  keys.add(versionKey);

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'public-assets-'));
  try {
    for (const file of files) {
      const target = path.join(directory, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, run('unzip', ['-p', archive, file]));
    }

    let oldKeys: string[] = [];
    if (!release) {
      const response = JSON.parse(aws('list-objects-v2', '--bucket', bucket, '--prefix', prefix,
        '--output', 'json').toString('utf8'));
      oldKeys = (response.Contents || []).map((item: { Key: string }) => item.Key);
      if (oldKeys.some((key) => !key.startsWith(prefix))) {
        throw new Error('Unexpected object outside branch asset prefix');
      }
    }

    for (const file of files) {
      aws('put-object', '--bucket', bucket, '--key', prefix + file.slice('public/'.length),
        '--body', path.join(directory, file), '--content-type',
        contentTypes[path.extname(file).toLowerCase()] || 'application/octet-stream',
        '--tagging', tagging);
    }
    for (const key of oldKeys.filter((item) => !keys.has(item)).sort()) {
      aws('delete-object', '--bucket', bucket, '--key', key);
    }

    const versionFile = path.join(directory, 'version.md');
    fs.writeFileSync(versionFile, `${release ? 'release-' : ''}${name}\n`);
    aws('put-object', '--bucket', bucket, '--key', versionKey, '--body', versionFile,
      '--content-type', 'text/markdown', '--tagging', tagging);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

if (require.main === module) {
  const [archive, bucket, name, flag, ...rest] = process.argv.slice(2);
  if (!archive || !bucket || !name || (flag && flag !== '--release') || rest.length) {
    throw new Error('Usage: node upload-assets.ts <archive> <bucket> <name> [--release]');
  }
  uploadAssets(archive, bucket, name, flag === '--release');
}

module.exports = { uploadAssets };
