import _get from 'lodash/get';

const layout = {
  header: {
    height: 48,
  },
  mininav: {
    defaultWidth: 72,
    expandedWidth: 240,
  },
  sidenav: {
    width: 240,
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
