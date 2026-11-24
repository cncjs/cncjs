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

const state = ({ state: { disabled, minimized, isFullscreen } }) => ({ disabled: !!disabled, minimized, isFullscreen });

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

describe('enable switch', () => {
  test('enabling a collapsed widget only switches it on, it stays collapsed', () => {
    const widget = mount({ disabled: true, minimized: true });

    widget.action.toggleDisabled();

    expect(state(widget)).toEqual({ disabled: false, minimized: true, isFullscreen: false });
  });

  test('enabling an expanded, disabled widget (after Expand All) keeps it expanded', () => {
    const widget = mount({ disabled: true, minimized: false });

    widget.action.toggleDisabled();

    expect(state(widget)).toEqual({ disabled: false, minimized: false, isFullscreen: false });
  });

  test('disabling an open widget collapses it', () => {
    const widget = mount({ disabled: false, minimized: false });

    widget.action.toggleDisabled();

    expect(state(widget)).toEqual({ disabled: true, minimized: true, isFullscreen: false });
  });

  test('disabling a collapsed widget keeps it collapsed', () => {
    const widget = mount({ disabled: false, minimized: true });

    widget.action.toggleDisabled();

    expect(state(widget)).toEqual({ disabled: true, minimized: true, isFullscreen: false });
  });

  test('disabling a full screen widget leaves full screen and collapses it', () => {
    const widget = mount({ disabled: false, minimized: false });
    widget.action.toggleFullscreen();

    widget.action.toggleDisabled();

    expect(state(widget)).toEqual({ disabled: true, minimized: true, isFullscreen: false });
    expect(findElement(widget.render(), 'CustomContent').props).toMatchObject({ disabled: true, fullscreen: false });
  });

  test('enabling again after that does not bring back full screen or expand', () => {
    const widget = mount({ disabled: false, minimized: false });
    widget.action.toggleFullscreen();
    widget.action.toggleDisabled();

    widget.action.toggleDisabled();

    expect(state(widget)).toEqual({ disabled: false, minimized: true, isFullscreen: false });
  });

  test('treats a widget with no saved disabled value as enabled', () => {
    const widget = mount({ minimized: false });

    widget.action.toggleDisabled();

    expect(state(widget)).toEqual({ disabled: true, minimized: true, isFullscreen: false });
  });
});

describe('collapse / expand button', () => {
  test('expanding a disabled widget also enables it', () => {
    const widget = mount({ disabled: true, minimized: true });

    widget.action.toggleMinimized();

    expect(state(widget)).toEqual({ disabled: false, minimized: false, isFullscreen: false });
  });

  test('expanding a disabled widget with no URL only expands it', () => {
    const widget = mount({ disabled: true, minimized: true, url: '' });

    widget.action.toggleMinimized();

    expect(state(widget)).toEqual({ disabled: true, minimized: false, isFullscreen: false });
  });

  test('collapsing an enabled widget does not disable it', () => {
    const widget = mount({ disabled: false, minimized: false });

    widget.action.toggleMinimized();

    expect(state(widget)).toEqual({ disabled: false, minimized: true, isFullscreen: false });
  });

  test('expanding a collapsed, enabled widget leaves it enabled', () => {
    const widget = mount({ disabled: false, minimized: true });

    widget.action.toggleMinimized();

    expect(state(widget)).toEqual({ disabled: false, minimized: false, isFullscreen: false });
  });

  test('collapsing a disabled widget that was opened by Expand All keeps it disabled', () => {
    const widget = mount({ disabled: true, minimized: false });

    widget.action.toggleMinimized();

    expect(state(widget)).toEqual({ disabled: true, minimized: true, isFullscreen: false });
  });
});

describe('Expand All / Collapse All (public expand() and collapse())', () => {
  test('expand() opens a disabled widget without enabling it', () => {
    const widget = mount({ disabled: true, minimized: true });

    widget.expand();

    expect(state(widget)).toEqual({ disabled: true, minimized: false, isFullscreen: false });
    expect(findElement(widget.render(), 'CustomContent').props.disabled).toBe(true);
  });

  test('expand() and collapse() leave an enabled widget enabled', () => {
    const widget = mount({ disabled: false, minimized: false });

    widget.collapse();
    expect(state(widget)).toEqual({ disabled: false, minimized: true, isFullscreen: false });

    widget.expand();
    expect(state(widget)).toEqual({ disabled: false, minimized: false, isFullscreen: false });
  });

  test('collapse() keeps a disabled widget disabled', () => {
    const widget = mount({ disabled: true, minimized: false });

    widget.collapse();

    expect(state(widget)).toEqual({ disabled: true, minimized: true, isFullscreen: false });
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
    const widget = mount({ disabled: false, minimized: true });

    widget.action.toggleFullscreen();
    expect(state(widget)).toEqual({ disabled: false, minimized: false, isFullscreen: true });

    widget.action.toggleFullscreen();
    expect(state(widget)).toEqual({ disabled: false, minimized: false, isFullscreen: false });
  });

  test('entering full screen on a disabled widget also enables it', () => {
    const widget = mount({ disabled: true, minimized: true });

    widget.action.toggleFullscreen();

    expect(state(widget)).toEqual({ disabled: false, minimized: false, isFullscreen: true });
    expect(findElement(widget.render(), 'CustomContent').props).toMatchObject({ disabled: false, fullscreen: true });
  });

  test('entering full screen on a disabled widget with no URL does not enable it', () => {
    const widget = mount({ disabled: true, minimized: true, url: '' });

    widget.action.toggleFullscreen();

    expect(state(widget)).toEqual({ disabled: true, minimized: false, isFullscreen: true });
  });
});

describe('saved settings', () => {
  test('saves disabled and minimized after each change', () => {
    const widget = mount({ disabled: false, minimized: false });

    widget.action.toggleDisabled();
    expect(WidgetConfig.values).toMatchObject({ disabled: true, minimized: true });

    widget.action.toggleMinimized();
    expect(WidgetConfig.values).toMatchObject({ disabled: false, minimized: false });

    widget.action.toggleMinimized();
    expect(WidgetConfig.values).toMatchObject({ disabled: false, minimized: true });
  });

  test('a disabled widget opened by Expand All is still open after a reload', () => {
    const before = mount({ disabled: true, minimized: true });
    before.expand();
    const saved = { ...WidgetConfig.values };

    const after = mount(saved);

    expect(state(after)).toEqual({ disabled: true, minimized: false, isFullscreen: false });
  });

  test('full screen is not saved, a reload starts out of full screen', () => {
    const before = mount({ disabled: false, minimized: false });
    before.action.toggleFullscreen();
    const saved = { ...WidgetConfig.values };

    const after = mount(saved);

    expect(state(after).isFullscreen).toBe(false);
  });
});
