const assert = require('node:assert/strict');
const test = require('node:test');
const { deployAssets } = require('../../scripts/deploy-assets.ts');

const prefix = 'public-portal/public-web-assets/feat-node24-upgrade/public/';
const destination = 's3://rsp-nonprod-apis-public-portal-web-assets/public/';

function mockCommands({ version = 'feat-node24-upgrade\n', keys = [`${prefix}all.css`, `${prefix}version.md`],
  targetKeys = ['public/old.js', 'public/version.md'], failCopy = false, failHead = false } = {}) {
  const calls = [];
  function run(command, args) {
    calls.push([command, args]);
    if (args[1] === 'head-object' && failHead) throw new Error('ZIP not found');
    if (args[1] === 'cp' && args[3] === '-') return Buffer.from(version);
    if (args[1] === 'list-objects-v2') {
      const selectedKeys = args[args.indexOf('--bucket') + 1] === 'artefact-bucket' ? keys : targetKeys;
      return Buffer.from(JSON.stringify({ Contents: selectedKeys.map((Key) => ({ Key })) }));
    }
    if (args[1] === 'cp' && args[3] !== '-' && failCopy) throw new Error('copy failed');
    return Buffer.alloc(0);
  }
  return { calls, run };
}

test('copies the selected assets before deleting obsolete nonprod assets', () => {
  const mock = mockCommands();
  deployAssets('artefact-bucket', 'feat-node24-upgrade.zip', mock.run);
  assert.equal(mock.calls[0][1][mock.calls[0][1].indexOf('--key') + 1],
    'public-portal/serveExpressApp/feat-node24-upgrade.zip');
  const copy = mock.calls[4][1];
  const removal = mock.calls[5][1];
  const marker = mock.calls[6][1];
  assert.deepEqual(copy.slice(0, 4), ['s3', 'cp', `s3://artefact-bucket/${prefix}all.css`,
    `${destination}all.css`]);
  assert.equal(removal[1], 'delete-object');
  assert.equal(removal[removal.indexOf('--key') + 1], 'public/old.js');
  assert.deepEqual(marker.slice(0, 4), ['s3', 'cp', `s3://artefact-bucket/${prefix}version.md`,
    `${destination}version.md`]);
  assert.ok(copy.includes('metadata-directive'));
  assert.ok(marker.includes('metadata-directive'));
});

test('accepts a release ZIP and checks its matching version', () => {
  const releasePrefix = 'public-portal/public-web-assets/release-v4.1.0/public/';
  const mock = mockCommands({
    version: 'release-v4.1.0\n',
    keys: [`${releasePrefix}all.css`, `${releasePrefix}version.md`],
  });
  deployAssets('artefact-bucket', 'release-v4.1.0.zip', mock.run);
  assert.equal(mock.calls[4][1][2], `s3://artefact-bucket/${releasePrefix}all.css`);
});

test('rejects invalid archive names before calling AWS', () => {
  for (const archive of ['../master.zip', 'master', '.zip', '..zip', 'folder/master.zip']) {
    const mock = mockCommands();
    assert.throws(() => deployAssets('artefact-bucket', archive, mock.run));
    assert.equal(mock.calls.length, 0);
  }
});

test('does not deploy when the ZIP or matching assets are missing or invalid', () => {
  for (const options of [{ failHead: true }, { version: 'wrong\n' },
    { keys: [`${prefix}version.md`] }, { keys: ['other/public/all.css'] },
    { keys: [`${prefix}../bad`, `${prefix}version.md`] }, { targetKeys: ['other/public/old.js'] }]) {
    const mock = mockCommands(options);
    assert.throws(() => deployAssets('artefact-bucket', 'feat-node24-upgrade.zip', mock.run));
    assert.ok(!mock.calls.some(([, args]) => (args[1] === 'cp' && args[3] !== '-')
      || args[1] === 'delete-object'));
  }
});

test('does not delete anything when the copy fails', () => {
  const mock = mockCommands({ failCopy: true });
  assert.throws(() => deployAssets('artefact-bucket', 'feat-node24-upgrade.zip', mock.run));
  assert.ok(!mock.calls.some(([, args]) => args[1] === 'delete-object'));
});
