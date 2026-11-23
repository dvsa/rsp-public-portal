const { execFileSync } = require('node:child_process');
const path = require('node:path');

type RunCommand = (command: string, args: string[]) => Buffer;

const runCommand: RunCommand = (command, args) => execFileSync(command, args, {
  maxBuffer: 128 * 1024 * 1024,
});

function deployAssets(bucket: string, archive: string, run: RunCommand = runCommand) {
  if (!bucket || !/^[A-Za-z0-9._-]+\.zip$/.test(archive)) {
    throw new Error('Provide an artefact bucket and a ZIP filename without a path');
  }
  const name = archive.slice(0, -4);
  if (!name || name === '.' || name === '..') throw new Error('Invalid ZIP filename');

  const prefix = `public-portal/public-web-assets/${name}/public/`;
  const source = `s3://${bucket}/${prefix}`;
  const destinationBucket = 'rsp-nonprod-apis-public-portal-web-assets';
  const destinationPrefix = 'public/';
  const destination = `s3://${destinationBucket}/${destinationPrefix}`;
  const aws = (...args: string[]) => run('aws', [...args, '--no-cli-pager']);

  aws('s3api', 'head-object', '--bucket', bucket, '--key', `public-portal/serveExpressApp/${archive}`);
  const version = aws('s3', 'cp', `${source}version.md`, '-', '--no-progress').toString('utf8').trim();
  if (version !== name) throw new Error('Asset version does not match the ZIP name');

  const response = JSON.parse(aws('s3api', 'list-objects-v2', '--bucket', bucket,
    '--prefix', prefix, '--output', 'json').toString('utf8'));
  const objects: { Key: string }[] = response.Contents || [];
  if (objects.some(({ Key }) => !Key.startsWith(prefix))) {
    throw new Error('Unexpected object outside the selected asset prefix');
  }
  const files = objects.map(({ Key }) => Key.slice(prefix.length)).filter((key) => !key.endsWith('/'));
  if (!files.includes('version.md') || !files.some((key) => key !== 'version.md')) {
    throw new Error('Selected asset prefix contains no assets');
  }
  if (files.some((key) => path.posix.normalize(key) !== key || key.split('/').includes('..')
      || /[\x00-\x1f]/.test(key))) {
    throw new Error('Invalid asset key');
  }

  const targetResponse = JSON.parse(aws('s3api', 'list-objects-v2', '--bucket', destinationBucket,
    '--prefix', destinationPrefix, '--output', 'json').toString('utf8'));
  const targetObjects: { Key: string }[] = targetResponse.Contents || [];
  if (targetObjects.some(({ Key }) => !Key.startsWith(destinationPrefix))) {
    throw new Error('Unexpected object outside the nonprod public prefix');
  }
  const sourceKeys = new Set(files.map((file) => destinationPrefix + file));
  for (const file of files.filter((item) => item !== 'version.md')) {
    aws('s3', 'cp', source + file, destination + file, '--copy-props', 'metadata-directive', '--no-progress');
  }
  for (const { Key } of targetObjects) {
    if (!sourceKeys.has(Key)) aws('s3api', 'delete-object', '--bucket', destinationBucket, '--key', Key);
  }
  aws('s3', 'cp', `${source}version.md`, `${destination}version.md`,
    '--copy-props', 'metadata-directive', '--no-progress');
}

if (require.main === module) {
  const [bucket, archive, ...rest] = process.argv.slice(2);
  if (!bucket || !archive || rest.length) {
    throw new Error('Usage: node deploy-assets.ts <artefact-bucket> <archive.zip>');
  }
  deployAssets(bucket, archive);
}

module.exports = { deployAssets };
