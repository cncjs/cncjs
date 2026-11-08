import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
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
