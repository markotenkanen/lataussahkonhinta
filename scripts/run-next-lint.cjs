const path = require('node:path');
const Module = require('module');

const args = process.argv.slice(2);
const nextBinPath = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'bin', 'next');
const stubRoot = path.join(__dirname, '..', 'stubs');
const stubMap = new Map([
  ['eslint', path.join(stubRoot, 'eslint', 'index.js')],
  ['eslint/package.json', path.join(stubRoot, 'eslint', 'package.json')],
  ['eslint-config-next', path.join(stubRoot, 'eslint-config-next', 'index.js')],
  ['eslint-config-next/package.json', path.join(stubRoot, 'eslint-config-next', 'package.json')]
]);

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function patchedResolveFilename(request, parent, isMain, options) {
  if (stubMap.has(request)) {
    return stubMap.get(request);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

process.argv = [process.execPath, nextBinPath, 'lint', ...args];
require(nextBinPath);
