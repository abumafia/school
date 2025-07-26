const fs = require('fs');
const path = require('path');

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf-8'));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(path.resolve(filePath), JSON.stringify(data, null, 2));
}

module.exports = { readJSON, writeJSON };
