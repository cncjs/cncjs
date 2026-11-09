const names = new Proxy({}, {
  get: (target, key) => (typeof key === 'string' ? key : undefined),
});
module.exports = { __esModule: true, default: names };
