import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAppUI } from '@app/test/render';
import { MEDIA_SOURCE_LOCAL, MEDIA_SOURCE_STREAM } from '../constants';

const mockValues = {
  mediaSource: MEDIA_SOURCE_LOCAL,
  deviceId: '__default__',
  url: '',
};
const mockSetConfig = jest.fn();

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: value => value },
}));

jest.mock('@app/widgets/shared/useWidgetConfig', () => ({
  __esModule: true,
  default: () => ({
    get: (path, fallback) => (mockValues[path] === undefined ? fallback : mockValues[path]),
    set: (path, value) => {
      mockValues[path] = value;
      mockSetConfig(path, value);
    },
  }),
}));

const SettingsModal = require('../modals/SettingsModal').default;

describe('Webcam settings draft', () => {
  beforeEach(() => {
    Object.assign(mockValues, {
      mediaSource: MEDIA_SOURCE_LOCAL,
      deviceId: '__default__',
      url: 'http://saved.example/stream',
    });
    mockSetConfig.mockClear();
  });

  test('does not write the draft when cancelled', () => {
    const onClose = jest.fn();
    renderAppUI(<SettingsModal onClose={onClose} />);

    fireEvent.click(screen.getByLabelText('Connect to an IP camera'));
    fireEvent.change(screen.getByRole('textbox', { name: 'Stream URL' }), {
      target: { value: 'http://cancelled.example/stream' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockSetConfig).not.toHaveBeenCalled();
    expect(mockValues.url).toBe('http://saved.example/stream');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('writes all settings only when saved', async () => {
    const onClose = jest.fn();
    renderAppUI(<SettingsModal onClose={onClose} />);

    fireEvent.click(screen.getByLabelText('Connect to an IP camera'));
    fireEvent.change(screen.getByRole('textbox', { name: 'Stream URL' }), {
      target: { value: 'http://camera.example/stream' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));

    expect(mockSetConfig).toHaveBeenCalledWith('mediaSource', MEDIA_SOURCE_STREAM);
    expect(mockSetConfig).toHaveBeenCalledWith('deviceId', '__default__');
    expect(mockSetConfig).toHaveBeenCalledWith('url', 'http://camera.example/stream');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('names the media source and video device controls', () => {
    renderAppUI(<SettingsModal onClose={jest.fn()} />);

    expect(screen.getByRole('radio', { name: 'Use a built-in camera or a connected webcam' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Connect to an IP camera' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Choose a video device' })).toBeInTheDocument();
  });

  test('completes the draft by keyboard alone', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderAppUI(<SettingsModal onClose={onClose} />);

    const ipCamera = screen.getByRole('radio', { name: 'Connect to an IP camera' });
    ipCamera.focus();
    await user.keyboard(' ');
    expect(ipCamera).toBeChecked();

    const streamUrl = screen.getByRole('textbox', { name: 'Stream URL' });
    streamUrl.focus();
    await user.clear(streamUrl);
    await user.keyboard('http://keyboard.example/stream');

    const save = screen.getByRole('button', { name: 'Save Changes' });
    save.focus();
    await user.keyboard('{Enter}');

    expect(mockSetConfig).toHaveBeenCalledWith('mediaSource', MEDIA_SOURCE_STREAM);
    expect(mockSetConfig).toHaveBeenCalledWith('url', 'http://keyboard.example/stream');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
