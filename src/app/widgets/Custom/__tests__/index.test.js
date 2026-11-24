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
// Keep widget config in memory so tests can seed it and check what was saved
jest.mock('../../WidgetConfig', () => {
  const values = {};
  return class WidgetConfig {
    static values = values;

    get(key, defaultValue) {
      return key in values ? values[key] : defaultValue;
    }

    set(key, value) {
      values[key] = value;
    }
  };
});

const React = require('react');
const WidgetConfig = require('../../WidgetConfig');
const CustomWidget = require('../index').default;

const props = {
  widgetId: 'custom:test',
  onFork: jest.fn(),
  onRemove: jest.fn(),
  sortable: { handleClassName: 'handle', filterClassName: 'filter' }
};

// Create the widget without rendering it. setState applies the update the way React does
// (object or updater function) and then runs componentDidUpdate, which saves to config.
const mount = (initialConfig = {}) => {
  Object.keys(WidgetConfig.values).forEach(key => delete WidgetConfig.values[key]);
  Object.assign(WidgetConfig.values, { url: 'http://localhost:8000/widget/', ...initialConfig });

  const widget = new CustomWidget(props);
  widget.setState = (update) => {
    const prevState = widget.state;
    const changes = typeof update === 'function' ? update(prevState, widget.props) : update;
    widget.state = { ...prevState, ...changes };
    widget.componentDidUpdate(widget.props, prevState);
  };
  return widget;
};

const pick = ({ disabled, minimized }) => ({ disabled, minimized });

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

describe('enable / disable', () => {
  test('enabling a collapsed, disabled widget also expands it', () => {
    const widget = mount({ disabled: true, minimized: true });

    widget.action.toggleDisabled();

    expect(pick(widget.state)).toEqual({ disabled: false, minimized: false });
  });

  test('enabling a disabled widget that is already expanded keeps it expanded', () => {
    const widget = mount({ disabled: true, minimized: false });

    widget.action.toggleDisabled();

    expect(pick(widget.state)).toEqual({ disabled: false, minimized: false });
  });

  test('disabling an open widget also collapses it', () => {
    const widget = mount({ disabled: false, minimized: false });

    widget.action.toggleDisabled();

    expect(pick(widget.state)).toEqual({ disabled: true, minimized: true });
  });

  test('disabling a collapsed, enabled widget keeps it collapsed', () => {
    const widget = mount({ disabled: false, minimized: true });

    widget.action.toggleDisabled();

    expect(pick(widget.state)).toEqual({ disabled: true, minimized: true });
  });

  test('treats a widget with no saved disabled value as enabled', () => {
    const widget = mount({ minimized: false });

    widget.action.toggleDisabled();

    expect(pick(widget.state)).toEqual({ disabled: true, minimized: true });
  });

  test('a disable followed by an enable returns to an open, enabled widget', () => {
    const widget = mount({ disabled: false, minimized: false });

    widget.action.toggleDisabled();
    widget.action.toggleDisabled();

    expect(pick(widget.state)).toEqual({ disabled: false, minimized: false });
  });

  test('saves both values so the pairing survives a reload', () => {
    const widget = mount({ disabled: true, minimized: true });

    widget.action.toggleDisabled();
    expect(WidgetConfig.values).toMatchObject({ disabled: false, minimized: false });

    widget.action.toggleDisabled();
    expect(WidgetConfig.values).toMatchObject({ disabled: true, minimized: true });
  });
});

describe('collapse / expand', () => {
  test('collapsing an enabled widget does not disable it', () => {
    const widget = mount({ disabled: false, minimized: false });

    widget.action.toggleMinimized();

    expect(pick(widget.state)).toEqual({ disabled: false, minimized: true });
    expect(WidgetConfig.values.disabled).toBe(false);
  });

  test('expanding a collapsed, enabled widget leaves it enabled', () => {
    const widget = mount({ disabled: false, minimized: true });

    widget.action.toggleMinimized();

    expect(pick(widget.state)).toEqual({ disabled: false, minimized: false });
  });

  test('expanding a disabled widget does not enable it', () => {
    const widget = mount({ disabled: true, minimized: true });

    widget.action.toggleMinimized();

    expect(pick(widget.state)).toEqual({ disabled: true, minimized: false });
  });

  test('the public collapse() and expand() methods leave disabled alone', () => {
    const widget = mount({ disabled: false, minimized: false });

    widget.collapse();
    expect(pick(widget.state)).toEqual({ disabled: false, minimized: true });

    widget.expand();
    expect(pick(widget.state)).toEqual({ disabled: false, minimized: false });
  });
});

describe('fullscreen', () => {
  test('passes the fullscreen state to the iframe content', () => {
    const widget = mount();

    expect(findElement(widget.render(), 'CustomContent').props.fullscreen).toBe(false);

    widget.action.toggleFullscreen();
    expect(findElement(widget.render(), 'CustomContent').props.fullscreen).toBe(true);

    widget.action.toggleFullscreen();
    expect(findElement(widget.render(), 'CustomContent').props.fullscreen).toBe(false);
  });

  test('entering full screen expands a collapsed widget, leaving keeps it expanded', () => {
    const widget = mount({ minimized: true });

    widget.action.toggleFullscreen();
    expect(widget.state).toMatchObject({ isFullscreen: true, minimized: false });

    widget.action.toggleFullscreen();
    expect(widget.state).toMatchObject({ isFullscreen: false, minimized: false });
  });

  test('disabling a full screen widget leaves full screen and collapses it', () => {
    const widget = mount({ disabled: false, minimized: false });
    widget.action.toggleFullscreen();

    widget.action.toggleDisabled();

    expect(widget.state).toMatchObject({ disabled: true, minimized: true, isFullscreen: false });
    expect(findElement(widget.render(), 'CustomContent').props).toMatchObject({ disabled: true, fullscreen: false });
  });

  test('enabling the widget again does not bring back full screen', () => {
    const widget = mount({ disabled: false, minimized: false });
    widget.action.toggleFullscreen();
    widget.action.toggleDisabled();

    widget.action.toggleDisabled();

    expect(widget.state).toMatchObject({ disabled: false, minimized: false, isFullscreen: false });
  });

  test('passes disabled through alongside fullscreen', () => {
    const widget = mount({ disabled: true });

    const content = findElement(widget.render(), 'CustomContent');

    expect(content.props).toMatchObject({ disabled: true, fullscreen: false });
    expect(React.isValidElement(content)).toBe(true);
  });
});
