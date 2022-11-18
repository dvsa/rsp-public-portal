/* eslint-disable */
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const outputPath = path.join(__dirname, '..', 'dist');
const outputArtifact = path.join(outputPath, 'package.zip');
const handlerPath = path.join(outputPath, 'handler.js');
const assetsPath = path.join(outputPath, 'public');
const viewsPath = path.join(outputPath, 'views');
const languagesPath = path.join(outputPath, 'i18n');

const output = fs.createWriteStream(outputArtifact);
const archive = archiver('zip', {
  zlib: { level: 9 }, // Sets the compression level.
});

archive.pipe(output);

archive.append(fs.readFileSync(handlerPath), { name: 'app.js' });
archive.directory(assetsPath, 'public');
archive.directory(viewsPath, 'views');
archive.directory(languagesPath, 'i18n');
archive.finalize();

