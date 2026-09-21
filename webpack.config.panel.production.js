const path = require('path');
const config = require('./webpack.config.panel');

module.exports = config({
  mode: 'production',
  outputPath: path.resolve(__dirname, 'dist/cncjs/panel'),
});
