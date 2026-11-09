const { entry } = require('../webpack.config.production');

test('production vendor entry contains application dependencies without test harness imports', () => {
  expect(entry.vendor).toContain('react');
  expect(entry.vendor.filter(name => /^(?:@testing-library\/|@app\/test(?:\/|$)|app\/test(?:\/|$))/.test(name))).toEqual([]);
});
