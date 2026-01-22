module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/src/**/*.test.js',
  ],
  transform: {
    '^.+\\.js$': ['babel-jest', { configFile: './babel.config.js' }],
  },
  moduleFileExtensions: ['js', 'json'],
  collectCoverageFrom: [
    'src/server/lib/**/*.js',
    '!src/server/lib/**/*.test.js',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
};
