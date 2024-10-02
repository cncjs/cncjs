/* eslint-disable */

// ES5
require('es5-shim/es5-shim');
require('es5-shim/es5-sham');

// Babel polyfill
require('babel-polyfill');

require('imports-loader?self=>window!js-polyfills/web'); // deps: Symbol
