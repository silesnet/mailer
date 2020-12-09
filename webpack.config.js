const path = require('path');

module.exports = {
  target: ['node', 'es6'],
  entry: {
    generate: path.resolve(__dirname, 'build', 'generate.js'),
    send: path.resolve(__dirname, 'build', 'send.js'),
  },
  output: {
    filename: 'mail-[name].js',
    path: path.resolve(__dirname, 'build/dist'),
  },
};
