import React from 'react';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import cloneDeep from 'lodash/cloneDeep';
import set from 'lodash/set';
import { renderAppUI } from '@app/test/render';

let mockState;
const mockPortalRoots = [];
const mockSet = jest.fn((path, value) => {
  mockState = set(cloneDeep(mockState), path, value);
});

jest.mock('@app/store/config', () => ({
  __esModule: true,
  default: { get: (path, fallback) => require('lodash/get')(mockState, path, fallback), set: mockSet },
}));

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: value => value },
}));

// Reproduce the separate-root boundary without unrelated global runtime owners.
jest.mock('@app/lib/portal', () => ({
  __esModule: true,
  default: Component => {
    const React = require('react');
    const { createRoot } = require('react-dom/client');
    const { TonicProvider } = require('@tonic-ui/react');
    const node = global.document.createElement('div');
    global.document.body.appendChild(node);
    const root = createRoot(node);
    mockPortalRoots.push({ root, node });
    root.render(<TonicProvider><Component onClose={jest.fn()} /></TonicProvider>);
  },
}));

jest.mock('@fortawesome/react-fontawesome', () => ({ FontAwesomeIcon: () => null }));

jest.mock('../Webcam', () => {
  const React = require('react');
  const useWidgetConfig = require('@app/widgets/shared/useWidgetConfig').default;
  return function CameraConfigProbe() {
    const config = useWidgetConfig();
    return <output>{`${config.get('mediaSource')}:${config.get('deviceId')}:${config.get('url')}`}</output>;
  };
});

const WebcamWidget = require('../index').default;

beforeEach(() => {
  mockState = { widgets: {
    webcam: { mediaSource: 'local', deviceId: 'default-camera', url: '' },
    'webcam:r6-settings': { mediaSource: 'local', deviceId: 'fork-camera', url: '' },
  } };
  navigator.mediaDevices = { enumerateDevices: jest.fn().mockResolvedValue([]) };
  mockSet.mockClear();
});

afterEach(() => {
  act(() => {
    mockPortalRoots.splice(0).forEach(({ root, node }) => {
      root.unmount();
      node.remove();
    });
  });
});

test('forked Webcam settings update the live widget while preserving the original camera', async () => {
  renderAppUI(
    <>
      <WebcamWidget widgetId="webcam" view="normal" onViewChange={jest.fn()} />
      <WebcamWidget widgetId="webcam:r6-settings" view="normal" onViewChange={jest.fn()} />
    </>
  );
  const regions = screen.getAllByRole('region', { name: 'Webcam widget' });
  fireEvent.click(within(regions[1]).getByRole('button', { name: 'More options' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Settings' }));
  await screen.findByRole('dialog');
  fireEvent.click(screen.getByRole('radio', { name: 'Connect to an IP camera' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Stream URL' }), {
    target: { value: 'http://camera.example/live.mp4' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

  await waitFor(() => {
    expect(regions[1]).toHaveTextContent('stream:fork-camera:http://camera.example/live.mp4');
  });
  expect(regions[0]).toHaveTextContent('local:default-camera:');
  expect(mockSet).toHaveBeenCalledWith(['widgets', 'webcam:r6-settings', 'url'], 'http://camera.example/live.mp4');
  expect(mockSet.mock.calls.every(([path]) => path[1] === 'webcam:r6-settings')).toBe(true);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
