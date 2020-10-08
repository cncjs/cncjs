import _get from 'lodash/get';

const layoutStyles = {
  header: {
    height: '16x',
    headingSize: '2xl',
  },
  footer: {
    height: '10x',
  },
};

Object.defineProperty(layoutStyles, 'get', {
  value: function get(key, defaultValue) {
    return _get(this, key, defaultValue);
  },
  writable: false,
  enumerable: false,
  configurable: false,
});

export default layoutStyles;
