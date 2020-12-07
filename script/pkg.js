'use strict';

const rimraf = require('rimraf');
const { exec } = require('pkg');

rimraf.sync('dist/*');

Promise.resolve()
  .then(() => console.log('Packaging linux binaries...'))
  .then(() => exec(['build/generate.js', '--target', 'node10-linux-x64', '--output', 'dist/mail-generate']))
  .then(() => exec(['build/send.js', '--target', 'node10-linux-x64', '--output', 'dist/mail-send']))
  .then(() => {
    console.log('Linux binaries done.');
    return Promise.resolve();
  })
  .then(() => console.log('Packaging windows binaries...'))
  .then(() => exec(['build/generate.js', '--target', 'node10-win-x64', '--output', 'dist/mail-generate.exe']))
  .then(() => exec(['build/send.js', '--target', 'node10-win-x64', '--output', 'dist/mail-send.exe']))
  .then(() => {
    console.log('Windows binaries done.');
    return Promise.resolve();
  });
