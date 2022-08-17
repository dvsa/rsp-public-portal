/* eslint-disable */
const fs = require('fs');

/*
*
* To bundle with webpack, all requires need to be declared and can't be done dynamically.
* All i18n translation files are dynamically required in i18n-express module, to fix this, replace the dynamic require path to known path
* so on build the files can be pulled in as modules and used when needed.
* this is to be removed under ticket RSP-2027
*
*/

try {
    console.log("Updating file path for i18n-express...");
    const file = 'node_modules/i18n-express/index.js';
    const data = fs.readFileSync(file, 'utf8');
    const newData = data.replace(/require\(langPath\ \+\ \'\/\'\ \+\ files\[i\]\)/g, "require('../../src/server/i18n' + '/' + files[i])");
    fs.writeFileSync(file, newData,'utf-8');
    console.log("Finished writing to node module i18n-express to update file path.");
} catch (err) {
  console.error(err);
}
