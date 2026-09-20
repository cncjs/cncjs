const path = require('path');
const config = require('./webpack.config.panel');

module.exports = config({
  mode: 'development',
  outputPath: path.resolve(__dirname, 'output/cncjs/panel'),
});
