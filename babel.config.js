module.exports = {
    extends: '@trendmicro/babel-config',
    presets: [
        '@babel/preset-env',
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
