const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { uploadAssets } = require('../../scripts/upload-assets.ts');

const branchPrefix = 'public-portal/public-web-assets/feat-node24-upgrade/public/';
const releasePrefix = 'public-portal/public-web-assets/release-v4.1.0/public/';

function mockCommands(files, oldKeys = []) {
  const calls = [];
  const uploads = new Map();
  function run(command, args) {
    calls.push([command, args]);
    if (command === 'unzip' && args[0] === '-Z') return Buffer.from(Object.keys(files).join('\n'));
    if (command === 'unzip' && args[0] === '-p') return Buffer.from(files[args[2]]);
    if (args[1] === 'list-objects-v2') {
      return Buffer.from(JSON.stringify({ Contents: oldKeys.map((Key) => ({ Key })) }));
    }
    if (args[1] === 'put-object') {
      uploads.set(args[args.indexOf('--key') + 1], {
        body: fs.readFileSync(args[args.indexOf('--body') + 1], 'utf8'),
        args,
      });
    }
    return Buffer.alloc(0);
  }
  return { calls, uploads, run };
}

test('uploads branch assets and version, deleting only stale assets', () => {
  const mock = mockCommands({ 'public/all.css': 'stylesheet' }, [
    `${branchPrefix}all.css`, `${branchPrefix}old.js`, `${branchPrefix}version.md`,
  ]);
  uploadAssets('package.zip', 'bucket', 'feat-node24-upgrade', false, mock.run);
  const listing = mock.calls.find(([, args]) => args[1] === 'list-objects-v2');
  assert.equal(listing[1][listing[1].indexOf('--prefix') + 1], branchPrefix);
  assert.equal(mock.uploads.get(`${branchPrefix}all.css`).body, 'stylesheet');
  assert.ok(mock.uploads.get(`${branchPrefix}all.css`).args.includes('text/css'));
  const version = mock.uploads.get(`${branchPrefix}version.md`);
  assert.equal(version.body, 'feat-node24-upgrade\n');
  assert.ok(version.args.includes('lifecycle_subject=true'));
  assert.ok(version.args.includes('text/markdown'));
  const deletes = mock.calls.filter(([, args]) => args[1] === 'delete-object');
  assert.equal(deletes.length, 1);
  assert.equal(deletes[0][1][deletes[0][1].indexOf('--key') + 1], `${branchPrefix}old.js`);
});

test('uploads release assets and ZIP name without deleting objects', () => {
  const mock = mockCommands({ 'public/all.css': 'stylesheet' });
  uploadAssets('package.zip', 'bucket', 'v4.1.0', true, mock.run);
  assert.equal(mock.uploads.get(`${releasePrefix}all.css`).body, 'stylesheet');
  const version = mock.uploads.get(`${releasePrefix}version.md`);
  assert.equal(version.body, 'release-v4.1.0.zip\n');
  assert.ok(version.args.includes('promote=YES'));
  assert.ok(!mock.calls.some(([, args]) => ['list-objects-v2', 'delete-object'].includes(args[1])));
});

test('rejects empty, unsafe and reserved paths before contacting S3', () => {
  for (const files of [{ 'app.js': 'handler' }, { 'public/../other': 'invalid' },
    { 'public/version.md': 'reserved' }, { 'public/*.css': 'invalid' }]) {
    const mock = mockCommands(files);
    assert.throws(() => uploadAssets('package.zip', 'bucket', 'feat-node24-upgrade', false, mock.run));
    assert.ok(!mock.calls.some(([command]) => command === 'aws'));
  }
});

test('does not delete stale assets if an upload fails', () => {
  const mock = mockCommands({ 'public/all.css': 'stylesheet' }, [`${branchPrefix}old.js`]);
  function failUpload(command, args) {
    if (args[1] === 'put-object') throw new Error('upload failed');
    return mock.run(command, args);
  }
  assert.throws(() => uploadAssets('package.zip', 'bucket', 'feat-node24-upgrade', false, failUpload));
  assert.ok(!mock.calls.some(([, args]) => args[1] === 'delete-object'));
});

test('rejects listed objects outside the branch prefix without uploading or deleting', () => {
  const mock = mockCommands({ 'public/all.css': 'stylesheet' }, ['public-portal/other/old.js']);
  assert.throws(() => uploadAssets('package.zip', 'bucket', 'feat-node24-upgrade', false, mock.run));
  assert.ok(!mock.calls.some(([, args]) => ['put-object', 'delete-object'].includes(args[1])));
});

test('extracts and uploads files from a real ZIP', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'public-assets-test-'));
  try {
    fs.mkdirSync(path.join(directory, 'public'));
    fs.writeFileSync(path.join(directory, 'public', 'all.css'), 'actual stylesheet');
    const archive = path.join(directory, 'package.zip');
    execFileSync('zip', ['-q', archive, 'public/all.css'], { cwd: directory });
    const mock = mockCommands({});
    function run(command, args) {
      return command === 'unzip' ? execFileSync(command, args) : mock.run(command, args);
    }
    uploadAssets(archive, 'bucket', 'feat-node24-upgrade', false, run);
    assert.equal(mock.uploads.get(`${branchPrefix}all.css`).body, 'actual stylesheet');
    assert.equal(mock.uploads.get(`${branchPrefix}version.md`).body, 'feat-node24-upgrade\n');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
