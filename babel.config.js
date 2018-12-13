module.exports = {
    extends: '@trendmicro/babel-config',
    env: {
        development: {
            plugins: ['react-hot-loader/babel']
        }
    },
    presets: [
        '@babel/preset-env',
        '@babel/preset-react'
    ],
    plugins: [
        'lodash'
    ]
};
