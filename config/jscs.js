//
// http://jscs.info/
//
module.exports = {
    // Disables style checking for specified paths declared with glob patterns.
    'excludeFiles': [
        'node_modules/**'
    ],
    // Attempts to parse your code as ES6+, JSX, and Flow using the babel-jscs package as the parser.
    // Please note that this is experimental, and will improve over time.
    'esnext': true,

    'disallowMixedSpacesAndTabs': true,
    'validateIndentation': 4,
}
