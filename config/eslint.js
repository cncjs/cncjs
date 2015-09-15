//
// http://eslint.org/docs/rules/
//
module.exports = {
    'rules': {
        'no-alert': 0,
        'no-bitwise': 0,
        'camelcase': 0, // default: 1
        'curly': 1,
        'eqeqeq': 0,
        'no-eq-null': 0,
        'guard-for-in': 1,
        'no-empty': 1,
        'no-use-before-define': 0,
        'no-obj-calls': 2,
        'no-unused-vars': 0,
        'new-cap': 1,
        'no-shadow': 0,
        'strict': 0, // default: 2
        'no-invalid-regexp': 2,
        'comma-dangle': 2,
        'no-undef': 1,
        'no-new': 1,
        'no-extra-semi': 1,
        'no-debugger': 2,
        'no-caller': 1,
        'semi': 1,
        'quotes': 0,
        'no-unreachable': 2
    },
    'globals': {
        '$': false
    },
    'env': {
        'browser': true,
        'node': true,
        'es6': true
    }
};
