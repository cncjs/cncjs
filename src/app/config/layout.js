import _get from 'lodash/get';

const layout = {
  header: {
    height: '16x',
    headingSize: '2xl',
  },
  footer: {
    height: '10x',
  },
};

Object.defineProperty(layout, 'get', {
  value: function get(key, defaultValue) {
    return _get(this, key, defaultValue);
  },
  writable: false,
  enumerable: false,
  configurable: false,
});

export default layout;
