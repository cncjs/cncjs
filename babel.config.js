module.exports = {
    extends: '@trendmicro/babel-config',
    presets: [
        // https://github.com/zloirock/core-js/blob/master/docs/2019-03-19-core-js-3-babel-and-a-look-into-the-future.md#usebuiltins-entry-with-corejs-3
        [
            '@babel/preset-env',
            {
                useBuiltIns: 'entry',
                corejs: 3,
            }
        ],
        '@babel/preset-react',
    ],
    plugins: [
        'lodash',
        ['prismjs', {
            'languages': ['javascript', 'css', 'markup', 'gcode'],
            'plugins': [],
            'theme': 'twilight',
            'css': true
        }],
    ]
};
