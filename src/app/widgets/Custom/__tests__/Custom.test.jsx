import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import pubsub from 'pubsub-js';
import { renderAppUI } from '@app/test/render';
import { WorkspaceLayoutProvider, useWorkspaceLayout } from '@app/pages/Workspace/WorkspaceLayoutProvider';
import WidgetConfigProvider from '@app/widgets/shared/WidgetConfigProvider';
import WidgetEventProvider from '@app/widgets/shared/WidgetEventProvider';

const mockConfigState = {
  session: {
    token: '',
  },
  workspace: { container: { primary: { widgets: ['custom:authority', 'custom:other'] } } },
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
    update: (path, updater) => mockSetPath(path, updater(mockGetPath(path))),
    on: jest.fn(),
    off: jest.fn(),
  },
}));

jest.mock('@app/pages/Workspace/widgetRegistry', () => ({ WIDGET_REGISTRY: { custom: { hasFrame: true } } }));

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
        <Custom disabled={false} isFullscreen={false} />
      </WidgetEventProvider>
    </WidgetConfigProvider>
  );
  const iframe = view.container.querySelector('iframe');

  fireEvent.load(iframe);
  expect(iframe).toHaveStyle({ verticalAlign: 'top', width: '100%', height: '100%' });
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
  const props = { disabled: false, isFullscreen: false };
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
  const transition = (fullscreen, widgetId = 'custom') => act(() => pubsub.publishSync('widget:fullscreenchange', { widgetId, fullscreen }));
  const connect = () => act(() => pubsub.publishSync('message:connect'));
  const actions = postMessage => postMessage.mock.calls.map(([message]) => message.action);

  beforeEach(() => {
    setCustomConfig('custom', { disabled: false, url: '/widget/' });
  });

  test('Custom leaves the optional iframe title omitted', () => {
    const view = mount();
    expect(view.container.querySelector('iframe')).not.toHaveAttribute('title');
  });

  test.each([false, true])('connect and reconnect report fullscreen=%s with the existing connection shape', fullscreen => {
    const { postMessage } = mount({ isFullscreen: fullscreen });
    expect(postMessage).not.toHaveBeenCalled();
    connect();
    connect();
    expect(postMessage).toHaveBeenCalledTimes(4);
    const changes = actions(postMessage).filter(action => action.type === 'change');
    expect(changes[1]).toEqual(changes[0]);
    expect(actions(postMessage).filter(action => action.type === 'change')).toEqual([
      {
        type: 'change',
        payload: {
          controller: { type: controller.type },
          connection: {
            type: controller.connection?.type,
            ident: controller.connection?.ident,
            options: controller.connection?.options,
          },
        },
      },
      expect.objectContaining({ type: 'change' }),
    ]);
    expect(actions(postMessage).filter(action => action.type === 'widget:state')).toEqual([
      { type: 'widget:state', payload: { fullscreen } },
      { type: 'widget:state', payload: { fullscreen } },
    ]);
    postMessage.mock.calls.forEach(([message, target]) => {
      expect(message.token).toBe('');
      expect(message.version).toBe(settings.version);
      expect(target).toBe('*');
    });
  });

  test('readiness subscribers handle fullscreen and controller changes independently', () => {
    const subscribe = jest.spyOn(pubsub, 'subscribe');
    const { postMessage } = mount({ isFullscreen: true });
    const readyHandlers = subscribe.mock.calls.filter(([topic]) => topic === 'message:connect').map(([, handler]) => handler);
    subscribe.mockRestore();
    expect(readyHandlers).toHaveLength(2);
    const handledTypes = readyHandlers.map(handler => {
      postMessage.mockClear();
      handler();
      expect(postMessage).toHaveBeenCalledTimes(1);
      return actions(postMessage)[0].type;
    });
    expect(handledTypes).toEqual(expect.arrayContaining(['change', 'widget:state']));
  });

  test.each([false, true])('readiness before native load sends fullscreen=%s once without a load fallback', fullscreen => {
    const view = renderAppUI(content({ isFullscreen: fullscreen }));
    const iframe = view.container.querySelector('iframe');
    const postMessage = jest.spyOn(iframe.contentWindow, 'postMessage');
    connect();
    expect(actions(postMessage).filter(action => action.type === 'change')).toHaveLength(1);
    expect(actions(postMessage).filter(action => action.type === 'widget:state')).toEqual([
      { type: 'widget:state', payload: { fullscreen } },
    ]);
    fireEvent.load(iframe);
    fireEvent.load(iframe);
    expect(postMessage).toHaveBeenCalledTimes(2);
  });

  test('native load cannot overwrite a later async transition', async () => {
    const view = renderAppUI(content({ isFullscreen: true }));
    const iframe = view.container.querySelector('iframe');
    const postMessage = jest.spyOn(iframe.contentWindow, 'postMessage');
    connect();
    fireEvent.load(iframe);
    view.rerender(content({ isFullscreen: false }));
    act(() => pubsub.publish('widget:fullscreenchange', { widgetId: 'custom', fullscreen: false }));
    await waitFor(() => expect(postMessage).toHaveBeenCalledTimes(3));
    expect(actions(postMessage).filter(action => action.type === 'widget:state')).toEqual([
      { type: 'widget:state', payload: { fullscreen: true } },
      { type: 'widget:state', payload: { fullscreen: false } },
    ]);
  });

  test('document lifecycle events retain the mounted target for reconnect and resize', () => {
    const view = mount({ isFullscreen: true });
    const iframe = view.container.querySelector('iframe');
    fireEvent(iframe, new Event('beforeunload'));
    fireEvent(iframe, new Event('unload'));
    fireEvent.error(iframe);
    connect();
    fireEvent.load(iframe);
    connect();
    expect(actions(view.postMessage).filter(action => action.type === 'widget:state')).toEqual([
      { type: 'widget:state', payload: { fullscreen: true } },
      { type: 'widget:state', payload: { fullscreen: true } },
    ]);
    expect(actions(view.postMessage).filter(action => action.type === 'change')).toHaveLength(2);
    act(() => pubsub.publishSync('message:resize', { scrollHeight: 234 }));
    expect(iframe.style.height).toBe('234px');
  });

  test('sends only boolean transitions and reconnect reads the latest state', () => {
    const view = mount({ isFullscreen: false });
    view.rerender(content({ isFullscreen: false }));
    expect(view.postMessage).not.toHaveBeenCalled();
    view.rerender(content({ isFullscreen: true }));
    transition(true);
    view.rerender(content({ isFullscreen: true }));
    view.rerender(content({ isFullscreen: false }));
    transition(false);
    expect(actions(view.postMessage)).toEqual([
      { type: 'widget:state', payload: { fullscreen: true } },
      { type: 'widget:state', payload: { fullscreen: false } },
    ]);
    connect();
    expect(actions(view.postMessage).filter(action => action.type === 'widget:state').map(action => action.payload.fullscreen)).toEqual([true, false, false]);
  });

  test('controller changes retain their connect-only behavior independently of fullscreen', () => {
    const view = mount();
    const original = { type: controller.type, connection: controller.connection };
    try {
      controller.type = 'Grbl';
      controller.connection = { type: 'serial', ident: 'test-only', options: { baudrate: 115200 } };
      view.rerender(content());
      expect(view.postMessage).not.toHaveBeenCalled();
      view.rerender(content({ isFullscreen: true }));
      transition(true);
      connect();
      expect(actions(view.postMessage).filter(action => action.type === 'change')).toEqual([
        { type: 'change', payload: { controller: { type: 'Grbl' }, connection: controller.connection } },
      ]);
      expect(actions(view.postMessage).filter(action => action.type === 'widget:state')).toEqual([
        { type: 'widget:state', payload: { fullscreen: true } },
        { type: 'widget:state', payload: { fullscreen: true } },
      ]);
    } finally {
      Object.assign(controller, original);
    }
  });

  test('disabling suppresses transitions and re-enabled iframe connects with current state', () => {
    const view = mount();
    view.rerender(content({ disabled: true, isFullscreen: true }));
    transition(true);
    expect(view.postMessage).not.toHaveBeenCalled();
    view.rerender(content({ isFullscreen: true }));
    const iframe = view.container.querySelector('iframe');
    fireEvent.load(iframe);
    const postMessage = jest.spyOn(iframe.contentWindow, 'postMessage');
    connect();
    expect(actions(postMessage).filter(action => action.type === 'widget:state')).toEqual([{ type: 'widget:state', payload: { fullscreen: true } }]);
    expect(actions(postMessage).filter(action => action.type === 'change')).toHaveLength(1);
    view.unmount();
    postMessage.mockClear();
    connect();
    expect(postMessage).not.toHaveBeenCalled();
  });

  test.each([false, true])('async messages use only the mounted iframe after disable/re-enable with fullscreen=%s', async fullscreen => {
    const view = mount({ isFullscreen: !fullscreen });
    const oldIframe = view.container.querySelector('iframe');
    act(() => {
      pubsub.publish('widget:fullscreenchange', { widgetId: 'custom', fullscreen });
      view.rerender(content({ disabled: true, isFullscreen: fullscreen }));
      pubsub.publish('message:connect');
    });
    await act(() => new Promise(resolve => {
      setTimeout(resolve, 0);
    }));
    expect(oldIframe.isConnected).toBe(false);
    expect(view.container.querySelector('iframe')).toBeNull();
    expect(view.postMessage).not.toHaveBeenCalled();

    act(() => {
      pubsub.publish('message:connect');
      pubsub.publish('widget:fullscreenchange', { widgetId: 'custom', fullscreen: !fullscreen });
    });
    await act(() => new Promise(resolve => {
      setTimeout(resolve, 0);
    }));
    expect(view.postMessage).not.toHaveBeenCalled();

    view.rerender(content({ isFullscreen: fullscreen }));
    const iframe = view.container.querySelector('iframe');
    expect(iframe).not.toBe(oldIframe);
    const postMessage = jest.spyOn(iframe.contentWindow, 'postMessage');
    // Reattach is sufficient: readiness must not depend on a native load event.
    act(() => pubsub.publish('message:connect'));
    await act(() => new Promise(resolve => {
      setTimeout(resolve, 0);
    }));
    expect(actions(postMessage).filter(action => action.type === 'widget:state')).toEqual([
      { type: 'widget:state', payload: { fullscreen } },
    ]);
    expect(actions(postMessage).filter(action => action.type === 'change')).toHaveLength(1);
    expect(view.postMessage).not.toHaveBeenCalled();
    view.unmount();
    act(() => pubsub.publish('message:connect'));
    await act(() => new Promise(resolve => {
      setTimeout(resolve, 0);
    }));
    expect(postMessage).toHaveBeenCalledTimes(2);
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
    transition(true, 'custom:fullscreen-first');
    view.rerender(pair('collapsed'));
    transition(false, 'custom:fullscreen-first');
    view.rerender(pair('normal'));
    expect(actions(first)).toEqual([
      { type: 'widget:state', payload: { fullscreen: true } },
      { type: 'widget:state', payload: { fullscreen: false } },
    ]);
    expect(second).not.toHaveBeenCalled();
    // No widget click/event is involved in these host-driven transitions.
    expect(screen.getAllByRole('button', { name: 'Collapse' })).toHaveLength(2);
    connect();
    expect(actions(first).filter(action => action.type === 'change')).toHaveLength(1);
    expect(actions(second).filter(action => action.type === 'change')).toHaveLength(1);
    expect(actions(second).filter(action => action.type === 'widget:state')).toEqual([{ type: 'widget:state', payload: { fullscreen: false } }]);
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
        <Custom disabled={disabled} isFullscreen={false} />
      </WidgetEventProvider>
    </WidgetConfigProvider>
  );
  const content = screen.getByText(text);
  expect(content.tagName).toBe('DIV');
  expect(content).toHaveStyle({ padding: '.75rem .5rem .75rem .5rem' });
  expect(content).not.toHaveStyle({ opacity: '0.65' });
  expect(view.container.querySelector('iframe')).toBeNull();
  view.unmount();
  config.unset(['widgets', widgetId]);
});

test('authoritative host events deduplicate local and external fullscreen transitions in StrictMode', async () => {
  setCustomConfig('custom:authority', { disabled: false, url: '/authority/' });
  setCustomConfig('custom:other', { disabled: false, url: '/other/' });
  const Harness = () => {
    const { getWidgetView, setWidgetView } = useWorkspaceLayout();
    return (
      <>
        <output data-testid="authoritative-view">{getWidgetView('custom:authority')}</output>
        {['before', 'during', 'after'].map(phase => (
          <button
            key={phase}
            type="button"
            onClick={() => {
              const toggle = () => {
                setWidgetView('custom:authority', 'fullscreen');
                setWidgetView('custom:authority', 'normal');
              };
              if (phase === 'before') {
                toggle();
                pubsub.publish('message:connect');
              } else if (phase === 'during') {
                const token = pubsub.subscribe('message:connect', () => {
                  pubsub.unsubscribe(token);
                  toggle();
                });
                pubsub.publish('message:connect');
              } else {
                pubsub.publish('message:connect');
                setTimeout(toggle, 0);
              }
            }}
          >
            Connect {phase}
          </button>
        ))}
        <button type="button" onClick={() => setWidgetView('custom:authority', 'fullscreen')}>External enter</button>
        <button type="button" onClick={() => setWidgetView('custom:authority', 'normal')}>External exit</button>
        <button
          type="button"
          onClick={() => {
            setWidgetView('custom:authority', 'fullscreen');
            setWidgetView('custom:authority', 'fullscreen');
            pubsub.publish('message:connect');
          }}
        >
          Immediate connect
        </button>
        <button
          type="button"
          onClick={() => {
            setWidgetView('custom:authority', 'fullscreen');
            setWidgetView('custom:authority', 'normal');
            setWidgetView('custom:authority', 'normal');
            pubsub.publish('message:connect');
          }}
        >
          Fast enter exit
        </button>
        <CustomWidget
          {...widgetProps('custom:authority', {
            view: getWidgetView('custom:authority'),
            onViewChange: next => setWidgetView('custom:authority', next),
          })}
        />
        <CustomWidget {...widgetProps('custom:other', { view: getWidgetView('custom:other') })} />
      </>
    );
  };
  const tree = () => <React.StrictMode><WorkspaceLayoutProvider><Harness /></WorkspaceLayoutProvider></React.StrictMode>;
  const view = renderAppUI(tree());
  const frames = view.container.querySelectorAll('iframe');
  frames.forEach(frame => fireEvent.load(frame));
  const first = jest.spyOn(frames[0].contentWindow, 'postMessage');
  const second = jest.spyOn(frames[1].contentWindow, 'postMessage');
  fireEvent.click(screen.getByText('External enter'));
  fireEvent.click(screen.getByText('External enter'));
  view.rerender(tree());
  await waitFor(() => expect(first).toHaveBeenCalledTimes(1));
  act(() => pubsub.publish('message:connect'));
  await waitFor(() => expect(first).toHaveBeenCalledTimes(3));
  fireEvent.click(screen.getByRole('button', { name: 'Exit Full Screen' }));
  await waitFor(() => expect(first).toHaveBeenCalledTimes(4));
  fireEvent.click(screen.getAllByRole('button', { name: 'More options' })[0]);
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Enter Full Screen' }));
  await waitFor(() => expect(first).toHaveBeenCalledTimes(5));
  fireEvent.click(screen.getByText('External exit'));
  fireEvent.click(screen.getByText('External exit'));
  await waitFor(() => expect(first).toHaveBeenCalledTimes(6));
  const sent = () => first.mock.calls.map(([message]) => message.action);
  const fullscreenValues = () => sent().filter(action => action.type === 'widget:state').map(action => action.payload.fullscreen);
  expect(fullscreenValues()).toEqual([true, true, false, true, false]);
  expect(sent().filter(action => action.type === 'change')).toHaveLength(1);
  expect(second.mock.calls.map(([message]) => message.action.type)).toEqual(expect.arrayContaining(['change', 'widget:state']));
  expect(second).toHaveBeenCalledTimes(2);
  first.mockClear();
  fireEvent.click(screen.getByText('Fast enter exit'));
  await waitFor(() => expect(first).toHaveBeenCalledTimes(4));
  expect(fullscreenValues()).toEqual([true, false, false]);
  expect(sent().filter(action => action.type === 'change')).toHaveLength(1);
  first.mockClear();
  fireEvent.click(screen.getByText('Immediate connect'));
  await waitFor(() => expect(first).toHaveBeenCalledTimes(3));
  expect(fullscreenValues()).toEqual([true, true]);
  expect(sent().filter(action => action.type === 'change')).toHaveLength(1);
  first.mockClear();
  fireEvent.click(screen.getByText('External exit'));
  await waitFor(() => expect(first).toHaveBeenCalledTimes(1));
  first.mockClear();
  for (const phase of ['before', 'during', 'after']) {
    fireEvent.click(screen.getByText(`Connect ${phase}`));
    // Each case has two actual transitions plus one independent ready sync.
    // eslint-disable-next-line no-await-in-loop
    await waitFor(() => expect(first).toHaveBeenCalledTimes(4));
    expect(fullscreenValues()).toEqual(phase === 'before' ? [true, false, false] : [false, true, false]);
    expect(sent().filter(action => action.type === 'change')).toHaveLength(1);
    expect(screen.getByTestId('authoritative-view')).toHaveTextContent('normal');
    first.mockClear();
  }
  fireEvent.click(screen.getByText('External enter'));
  view.unmount();
  await new Promise(resolve => {
    setTimeout(resolve, 0);
  });
  expect(first).not.toHaveBeenCalled();
});
