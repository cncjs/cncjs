import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderAppUI } from '@app/test/render';
import { MEDIA_SOURCE_LOCAL, MEDIA_SOURCE_STREAM } from '../constants';

const mockValues = {};
const mockSet = jest.fn();
const mockEmitter = {
  off: jest.fn(),
  on: jest.fn(),
};

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: value => value },
}));

jest.mock('@app/widgets/shared/useWidgetConfig', () => ({
  __esModule: true,
  default: () => ({
    get: (path, fallback) => (mockValues[path] === undefined ? fallback : mockValues[path]),
    set: (path, value) => mockSet(path, value),
  }),
}));

jest.mock('@app/widgets/shared/useWidgetEvent', () => ({
  __esModule: true,
  default: () => mockEmitter,
}));

jest.mock('@app/components/Webcam', () => ({
  __esModule: true,
  default: props => <div {...props} />,
}));

const Webcam = require('../Webcam').default;

describe('Webcam display controls', () => {
  beforeEach(() => {
    Object.assign(mockValues, {
      mediaSource: MEDIA_SOURCE_LOCAL,
      muted: false,
      crosshair: false,
      'geometry.flipHorizontally': false,
      'geometry.flipVertically': false,
      'geometry.rotation': 0,
      'geometry.scale': 1,
    });
    jest.clearAllMocks();
  });

  test('persists mute and geometry control changes', () => {
    renderAppUI(<Webcam disabled={false} isFullscreen={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Mute' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rotate Left' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rotate Right' }));
    fireEvent.click(screen.getByRole('button', { name: 'Flip Horizontally' }));
    fireEvent.click(screen.getByRole('button', { name: 'Flip Vertically' }));
    fireEvent.click(screen.getByRole('button', { name: 'Crosshair' }));

    expect(mockSet.mock.calls).toEqual(expect.arrayContaining([
      ['muted', true],
      ['geometry.rotation', 3],
      ['geometry.rotation', 1],
      ['geometry.flipHorizontally', true],
      ['geometry.flipVertically', true],
      ['crosshair', true],
    ]));
  });

  test('declares the image scale slider range for keyboard operation', () => {
    renderAppUI(<Webcam disabled={false} isFullscreen={false} />);

    const slider = screen.getByRole('slider', { name: 'Image scale' });
    expect(slider).toHaveAttribute('aria-valuemin', '0.1');
    expect(slider).toHaveAttribute('aria-valuemax', '10');
    expect(slider).toHaveAttribute('aria-valuenow', '1');
  });

  test('commits image scale keyboard changes to the widget config', () => {
    renderAppUI(<Webcam disabled={false} isFullscreen={false} />);

    const slider = screen.getByRole('slider', { name: 'Image scale' });
    fireEvent.keyDown(slider, { key: 'ArrowRight', keyCode: 39, which: 39 });

    expect(mockSet).toHaveBeenCalledWith('geometry.scale', 1.1);
  });

  test('refreshes the current stream element and clears its timer on unmount', () => {
    jest.useFakeTimers();
    mockValues.mediaSource = MEDIA_SOURCE_STREAM;
    mockValues.url = 'http://0.0.0.0:8080/?action=stream';
    const view = renderAppUI(<Webcam disabled={false} isFullscreen={false} />);
    const onRefresh = mockEmitter.on.mock.calls.find(([event]) => event === 'refresh')[1];
    const image = view.container.querySelector('img');

    act(() => onRefresh());
    expect(image.getAttribute('src')).toBe('');
    act(() => jest.runOnlyPendingTimers());
    expect(image.getAttribute('src')).toContain('8080/?action=stream');

    view.unmount();
    expect(mockEmitter.off).toHaveBeenCalledWith('refresh', onRefresh);
    jest.useRealTimers();
  });
});
