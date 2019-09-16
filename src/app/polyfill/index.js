import 'es5-shim/es5-shim';
import 'es5-shim/es5-sham';
import 'core-js/stable'; // to polyfill ECMAScript features
import 'regenerator-runtime/runtime'; // needed to use transpiled generator functions
import 'imports-loader?self=>window!js-polyfills/web'; // deps: Symbol
import './console'; // IE9
