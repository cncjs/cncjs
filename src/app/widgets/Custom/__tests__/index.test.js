/* eslint-env jest */
jest.mock('app/lib/controller', () => ({
  port: '',
  type: '',
  state: {},
  workflow: { state: 'idle' },
  addListener: jest.fn(),
  removeListener: jest.fn()
}));
jest.mock('app/lib/i18n', () => ({ _: text => text }));
jest.mock('app/components/Space', () => 'Space');
jest.mock('app/components/Widget', () => {
  const Widget = () => null;
  [
    'Header', 'Title', 'Sortable', 'Controls', 'Button',
    'DropdownButton', 'DropdownMenuItem', 'Content'
  ].forEach(name => {
    Widget[name] = `Widget.${name}`;
  });
  return Widget;
});
jest.mock('../Custom', () => 'CustomContent');
jest.mock('../Settings', () => 'Settings');
jest.mock('../index.styl', () => ({ widgetContent: 'widget-content', hidden: 'hidden', fullscreen: 'fullscreen' }));
jest.mock('../../WidgetConfig', () => class WidgetConfig {
  get(key, defaultValue) {
    return defaultValue;
  }
});

const CustomWidget = require('../index').default;

const props = {
  widgetId: 'custom:test',
  onFork: jest.fn(),
  onRemove: jest.fn(),
  sortable: { handleClassName: 'handle', filterClassName: 'filter' }
};

// Walk the element tree returned by render() and return the first element of the given type
const findElement = (element, type) => {
  if (!element || typeof element !== 'object') {
    return null;
  }
  if (Array.isArray(element)) {
    for (const child of element) {
      const found = findElement(child, type);
      if (found) {
        return found;
      }
    }
    return null;
  }
  if (element.type === type) {
    return element;
  }
  return findElement(element.props && element.props.children, type);
};

describe('fullscreen', () => {
  test('passes the fullscreen state to the iframe content', () => {
    const widget = new CustomWidget(props);
    widget.setState = changes => {
      widget.state = { ...widget.state, ...changes };
    };

    expect(findElement(widget.render(), 'CustomContent').props.fullscreen).toBe(false);

    widget.action.toggleFullscreen();
    expect(findElement(widget.render(), 'CustomContent').props.fullscreen).toBe(true);

    widget.action.toggleFullscreen();
    expect(findElement(widget.render(), 'CustomContent').props.fullscreen).toBe(false);
  });
});
