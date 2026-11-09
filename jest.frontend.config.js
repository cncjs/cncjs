module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/app/**/__tests__/**/*.test.[jt]s?(x)'],
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', {
      configFile: false,
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
      ],
    }],
  },
  moduleNameMapper: {
    // Asset mocks must precede the `@app` alias: Jest applies the first
    // matching pattern, and aliased asset requests (e.g.
    // `@app/images/logo.png`) would otherwise resolve to the raw file and
    // fail to parse.
    '\\.(styl|css)$': '<rootDir>/src/app/test/styleMock.js',
    '\\.(png|jpe?g|gif|svg|woff2?|ttf|eot)$': '<rootDir>/src/app/test/fileMock.js',
    '^@app$': '<rootDir>/src/app',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^app/(.*)$': '<rootDir>/src/app/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/app/test/setup.js'],
  clearMocks: true,
  testTimeout: 10000,
};
