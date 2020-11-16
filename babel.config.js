module.exports = (api) => {
  const { env } = { ...api };
  const plugins = [
    '@emotion/babel-plugin',
    'lodash',
    ['prismjs', {
      'languages': ['javascript', 'css', 'markup', 'gcode'],
      'plugins': [],
      'theme': 'twilight',
      'css': true
    }],
    [require.resolve('babel-plugin-module-resolver'), {
      alias: {
        'server': './src/server',
      },
    }],
  ];

  if (typeof env === 'function' && env('test')) {
    // Enable async/await for jest
    plugins.push('@babel/plugin-transform-runtime');
  }

  return {
    extends: '@trendmicro/babel-config',
    presets: [
      [
        '@babel/preset-env',
        {
          useBuiltIns: 'entry',
          corejs: 3,
        }
      ],
      [
        '@babel/preset-react',
        { // https://emotion.sh/docs/css-prop#babel-preset
          runtime: 'automatic',
          importSource: '@emotion/react',
        },
      ],
    ],
    plugins,
  };
};
