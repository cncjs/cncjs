import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import pubsub from 'pubsub-js';
import { renderAppUI } from '@app/test/render';
import WidgetConfigProvider from '@app/widgets/shared/WidgetConfigProvider';
import WidgetEventProvider from '@app/widgets/shared/WidgetEventProvider';

const mockConfigState = {
  session: {
    token: '',
  },
  widgets: {
    custom: {
      disabled: true,
      title: '',
      url: '',
    },
  },
};

const mockGetPath = (path) => {
  const paths = Array.isArray(path) ? path : path.split('.');
  return paths.reduce((value, key) => (value == null ? value : value[key]), mockConfigState);
};

const mockSetPath = (path, value) => {
  const paths = Array.isArray(path) ? path : path.split('.');
  const last = paths.pop();
  const target = paths.reduce((current, key) => {
    if (!current[key]) {
      current[key] = {};
    }
    return current[key];
  }, mockConfigState);
  target[last] = value;
};

const mockUnsetPath = (path) => {
  const paths = Array.isArray(path) ? path : path.split('.');
  const last = paths.pop();
  const target = mockGetPath(paths);
  if (target) {
    delete target[last];
  }
};

jest.mock('@app/store/config', () => ({
  __esModule: true,
  default: {
    get: (path, fallback) => {
      const value = mockGetPath(path);
      return value === undefined ? fallback : value;
    },
    set: (path, value) => mockSetPath(path, value),
    unset: path => mockUnsetPath(path),
  },
}));

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: {
    _: value => value,
  },
}));

const config = require('@app/store/config').default;

const Iframe = require('@app/components/Iframe').default;
const Custom = require('../Custom').default;
const CustomWidget = require('../index').default;
const SettingsModal = require('../modals/SettingsModal').default;

test('forwards iframe load callbacks and removes its native listeners on unmount', () => {
  const onLoad = jest.fn();
  const onBeforeUnload = jest.fn();
  const onUnload = jest.fn();
  const { container, unmount } = renderAppUI(
    <Iframe
      src="/widget/?token=token"
      onBeforeUnload={onBeforeUnload}
      onLoad={onLoad}
      onUnload={onUnload}
    />
  );
  const iframe = container.querySelector('iframe');

  fireEvent.load(iframe);
  fireEvent(iframe, new Event('beforeunload'));
  fireEvent(iframe, new Event('unload'));

  expect(onLoad).toHaveBeenCalledWith(expect.objectContaining({ iframe }));
  expect(onBeforeUnload).toHaveBeenCalledWith(expect.objectContaining({ iframe }));
  expect(onUnload).toHaveBeenCalledTimes(1);

  unmount();
  fireEvent.load(iframe);
  fireEvent(iframe, new Event('beforeunload'));
  fireEvent(iframe, new Event('unload'));

  expect(onLoad).toHaveBeenCalledTimes(1);
  expect(onBeforeUnload).toHaveBeenCalledTimes(1);
  expect(onUnload).toHaveBeenCalledTimes(1);
});

const widgetProps = (widgetId, overrides = {}) => ({
  widgetId,
  onFork: jest.fn(),
  onRemove: jest.fn(),
  onViewChange: jest.fn(),
  view: 'normal',
  sortable: {
    handleClassName: '',
    filterClassName: '',
  },
  ...overrides,
});

const setCustomConfig = (widgetId, values) => {
  const base = config.get(['widgets', 'custom']);
  config.set(['widgets', widgetId], {
    ...base,
    ...values,
  });
};

test('keeps each fork iframe URL isolated when the host changes widget ids', () => {
  setCustomConfig('custom:one', {
    disabled: false,
    title: 'One',
    url: '/widget-one/',
  });
  setCustomConfig('custom:two', {
    disabled: false,
    title: 'Two',
    url: '/widget-two/',
  });

  const view = renderAppUI(
    <CustomWidget {...widgetProps('custom:one')} />
  );

  expect(view.container.querySelector('iframe')).toHaveAttribute(
    'src',
    '/widget-one/?token='
  );

  view.rerender(<CustomWidget {...widgetProps('custom:two')} />);

  expect(view.container.querySelector('iframe')).toHaveAttribute(
    'src',
    '/widget-two/?token='
  );

  view.unmount();
  config.unset(['widgets', 'custom:one']);
  config.unset(['widgets', 'custom:two']);
});

test('keeps the URL draft local until Settings saves it', async () => {
  setCustomConfig('custom', {
    title: 'Custom',
    url: '/saved/',
  });
  const onClose = jest.fn();
  const view = renderAppUI(
    <WidgetConfigProvider widgetId="custom">
      <SettingsModal onClose={onClose} />
    </WidgetConfigProvider>
  );

  fireEvent.change(screen.getByRole('textbox', { name: 'URL' }), {
    target: { value: '/cancelled/' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  expect(config.get(['widgets', 'custom', 'url'])).toBe('/saved/');

  view.rerender(
    <WidgetConfigProvider widgetId="custom">
      <SettingsModal onClose={onClose} />
    </WidgetConfigProvider>
  );
  fireEvent.change(screen.getByRole('textbox', { name: 'URL' }), {
    target: { value: '/saved-after-draft/' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

  await waitFor(() => expect(config.get(['widgets', 'custom', 'url'])).toBe('/saved-after-draft/'));
  expect(onClose).toHaveBeenCalledTimes(2);
});

test('cleans iframe message listeners on unmount', () => {
  setCustomConfig('custom', {
    disabled: false,
    url: '/widget/',
  });

  const view = renderAppUI(
    <WidgetConfigProvider widgetId="custom">
      <WidgetEventProvider>
        <Custom disabled={false} />
      </WidgetEventProvider>
    </WidgetConfigProvider>
  );
  const iframe = view.container.querySelector('iframe');

  fireEvent.load(iframe);
  pubsub.publishSync('message:resize', { scrollHeight: 123 });
  expect(iframe.style.height).toBe('123px');

  view.unmount();
  iframe.style.height = '999px';
  pubsub.publishSync('message:resize', { scrollHeight: 1000 });
  expect(iframe.style.height).toBe('999px');

  config.set(['widgets', 'custom', 'disabled'], true);
  config.set(['widgets', 'custom', 'url'], '');
});

test('uses the host view contract for collapse and expand', () => {
  setCustomConfig('custom', {
    disabled: true,
    url: '',
  });
  const onViewChange = jest.fn();

  renderAppUI(
    <CustomWidget {...widgetProps('custom', { onViewChange })} />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Collapse' }));
  expect(onViewChange).toHaveBeenCalledWith('collapsed');
});

describe('fullscreen iframe notifications', () => {
  const controller = require('@app/lib/controller').default;
  const settings = require('@app/config/settings').default;
  const props = { disabled: false, fullscreen: false };
  const content = overrides => (
    <WidgetConfigProvider widgetId="custom">
      <WidgetEventProvider>
        <Custom {...props} {...overrides} />
      </WidgetEventProvider>
    </WidgetConfigProvider>
  );
  const mount = (overrides = {}) => {
    const view = renderAppUI(content(overrides));
    const iframe = view.container.querySelector('iframe');
    fireEvent.load(iframe);
    const postMessage = jest.spyOn(iframe.contentWindow, 'postMessage');
    return { ...view, postMessage };
  };
  const connect = () => act(() => pubsub.publishSync('message:connect'));
  const actions = postMessage => postMessage.mock.calls.map(([message]) => message.action);

  beforeEach(() => {
    setCustomConfig('custom', { disabled: false, url: '/widget/' });
  });

  test.each([false, true])('connect and reconnect report fullscreen=%s with the existing connection shape', fullscreen => {
    const { postMessage } = mount({ fullscreen });
    expect(postMessage).not.toHaveBeenCalled();
    connect();
    connect();
    expect(postMessage).toHaveBeenCalledTimes(2);
    expect(postMessage).toHaveBeenLastCalledWith({
      token: '',
      version: settings.version,
      action: {
        type: 'change',
        payload: {
          fullscreen,
          controller: { type: controller.type },
          connection: {
            type: controller.connection?.type,
            ident: controller.connection?.ident,
            options: controller.connection?.options,
          },
        },
      },
    }, '*');
  });

  test('sends only boolean transitions and reconnect reads the latest state', () => {
    const view = mount({ fullscreen: undefined });
    view.rerender(content({ fullscreen: false }));
    expect(view.postMessage).not.toHaveBeenCalled();
    view.rerender(content({ fullscreen: 1 }));
    view.rerender(content({ fullscreen: true }));
    view.rerender(content({ fullscreen: false }));
    expect(actions(view.postMessage)).toEqual([
      { type: 'widget:fullscreenchange', payload: { fullscreen: true } },
      { type: 'widget:fullscreenchange', payload: { fullscreen: false } },
    ]);
    connect();
    expect(actions(view.postMessage)[2].payload.fullscreen).toBe(false);
  });

  test('controller changes retain their connect-only behavior independently of fullscreen', () => {
    const view = mount();
    const original = { type: controller.type, connection: controller.connection };
    try {
      controller.type = 'Grbl';
      controller.connection = { type: 'serial', ident: 'test-only', options: { baudrate: 115200 } };
      view.rerender(content());
      expect(view.postMessage).not.toHaveBeenCalled();
      view.rerender(content({ fullscreen: true }));
      connect();
      expect(actions(view.postMessage)).toEqual([
        { type: 'widget:fullscreenchange', payload: { fullscreen: true } },
        { type: 'change', payload: { fullscreen: true, controller: { type: 'Grbl' }, connection: controller.connection } },
      ]);
    } finally {
      Object.assign(controller, original);
    }
  });

  test('disabling suppresses transitions and re-enabled iframe connects with current state', () => {
    const view = mount();
    view.rerender(content({ disabled: true, fullscreen: true }));
    expect(view.postMessage).not.toHaveBeenCalled();
    view.rerender(content({ fullscreen: true }));
    const iframe = view.container.querySelector('iframe');
    fireEvent.load(iframe);
    const postMessage = jest.spyOn(iframe.contentWindow, 'postMessage');
    connect();
    expect(actions(postMessage).map(action => [action.type, action.payload.fullscreen])).toEqual([['change', true]]);
    view.unmount();
    postMessage.mockClear();
    connect();
    expect(postMessage).not.toHaveBeenCalled();
  });

  test('external host view changes notify only the corresponding widget and preserve connect broadcast routing', () => {
    setCustomConfig('custom:fullscreen-first', { disabled: false, url: '/widget/' });
    setCustomConfig('custom:fullscreen-second', { disabled: false, url: '/widget-two/' });
    const pair = view => (
      <>
        <CustomWidget {...widgetProps('custom:fullscreen-first', { view })} />
        <CustomWidget {...widgetProps('custom:fullscreen-second')} />
      </>
    );
    const view = renderAppUI(pair('normal'));
    const iframes = view.container.querySelectorAll('iframe');
    iframes.forEach(iframe => fireEvent.load(iframe));
    const first = jest.spyOn(iframes[0].contentWindow, 'postMessage');
    const second = jest.spyOn(iframes[1].contentWindow, 'postMessage');
    view.rerender(pair('fullscreen'));
    view.rerender(pair('collapsed'));
    view.rerender(pair('normal'));
    expect(actions(first)).toEqual([
      { type: 'widget:fullscreenchange', payload: { fullscreen: true } },
      { type: 'widget:fullscreenchange', payload: { fullscreen: false } },
    ]);
    expect(second).not.toHaveBeenCalled();
    // No widget click/event is involved in these host-driven transitions.
    expect(screen.getAllByRole('button', { name: 'Collapse' })).toHaveLength(2);
    connect();
    expect(actions(first)[2].type).toBe('change');
    expect(actions(second)[0].type).toBe('change');
    view.unmount();
    config.unset(['widgets', 'custom:fullscreen-first']);
    config.unset(['widgets', 'custom:fullscreen-second']);
  });
});

test.each([
  ['disabled', true, '/widget/', 'The widget is currently disabled'],
  ['unconfigured', false, '', 'URL not configured'],
])('%s content retains div semantics and inactive spacing with Tonic Box', (id, disabled, url, text) => {
  const widgetId = `custom:inactive-${id}`;
  setCustomConfig(widgetId, { disabled, url });
  const view = renderAppUI(
    <WidgetConfigProvider widgetId={widgetId}>
      <WidgetEventProvider>
        <Custom disabled={disabled} />
      </WidgetEventProvider>
    </WidgetConfigProvider>
  );
  const content = screen.getByText(text);
  expect(content.tagName).toBe('DIV');
  expect(content).toHaveStyle({ padding: '8px 12px', opacity: '0.65' });
  expect(view.container.querySelector('iframe')).toBeNull();
  view.unmount();
  config.unset(['widgets', widgetId]);
});
