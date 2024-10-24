module.exports = (api) => {
  const { env } = { ...api };
  const plugins = [
    'lodash',
  ];

  if (typeof env === 'function' && env('test')) {
    // Enable async/await for jest
    plugins.push('@babel/plugin-transform-runtime');
  }

  if (typeof env === 'function' && env('development')) {
    plugins.push('react-refresh/babel');
  }

  return {
    extends: '@trendmicro/babel-config',
    presets: [
      '@babel/preset-env',
      '@babel/preset-react'
    ],
    plugins,
  };
};
