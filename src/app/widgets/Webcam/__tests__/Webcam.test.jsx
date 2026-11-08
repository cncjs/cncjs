import React from 'react';
import { act, render } from '@testing-library/react';
import Webcam from '@app/components/Webcam';

describe('Webcam media owner', () => {
  beforeEach(() => {
    navigator.mediaDevices = { getUserMedia: jest.fn() };
  });

  test('stops a late media request after unmount', async () => {
    let resolve;
    const stop = jest.fn();
    const stream = { getTracks: () => [{ stop }] };
    navigator.mediaDevices.getUserMedia.mockReturnValue(new Promise(done => {
      resolve = done;
    }));
    const view = render(<Webcam audio={false} video />);
    view.unmount();
    await act(() => {
      resolve(stream);
      return Promise.resolve();
    });
    expect(stop).toHaveBeenCalledTimes(1);
  });

  test('releases the active stream on unmount', async () => {
    const stop = jest.fn();
    navigator.mediaDevices.getUserMedia.mockResolvedValue({ getTracks: () => [{ stop }] });
    const view = render(<Webcam audio={false} video />);
    await act(async () => {
      await Promise.resolve();
    });
    view.unmount();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  test('releases the prior stream when the selected device changes', async () => {
    const firstStop = jest.fn();
    const secondStop = jest.fn();
    navigator.mediaDevices.getUserMedia
      .mockResolvedValueOnce({ getTracks: () => [{ stop: firstStop }] })
      .mockResolvedValueOnce({ getTracks: () => [{ stop: secondStop }] });
    const view = render(<Webcam audio={false} video="first" />);

    await act(() => Promise.resolve());
    view.rerender(<Webcam audio={false} video="second" />);
    await act(() => Promise.resolve());

    expect(firstStop).toHaveBeenCalledTimes(1);
    expect(secondStop).not.toHaveBeenCalled();
  });
});

test('detaches srcObject immediately on device change and ignores an older pending request', async () => {
  let resolveFirst;
  const oldStop = jest.fn();
  const currentStop = jest.fn();
  const current = { getTracks: () => [{ stop: currentStop }] };
  navigator.mediaDevices = { getUserMedia: jest.fn()
    .mockReturnValueOnce(new Promise(resolve => {
      resolveFirst = resolve;
    }))
    .mockResolvedValueOnce(current) };
  const view = render(<Webcam audio={false} video="first" />);
  const element = view.container.querySelector('video');
  view.rerender(<Webcam audio={false} video="second" />);
  expect(element.srcObject).toBeNull();
  await act(() => Promise.resolve());
  expect(element.srcObject).toBe(current);
  await act(() => {
    resolveFirst({ getTracks: () => [{ stop: oldStop }] });
    return Promise.resolve();
  });
  expect(oldStop).toHaveBeenCalledTimes(1);
  expect(element.srcObject).toBe(current);
  view.unmount();
  expect(element.srcObject).toBeNull();
  expect(currentStop).toHaveBeenCalledTimes(1);
});

test('rejected requests and unavailable media APIs unmount safely', async () => {
  navigator.mediaDevices = { getUserMedia: jest.fn().mockRejectedValue(new Error('denied')) };
  const view = render(<Webcam />);
  await act(() => Promise.resolve());
  expect(view.container.querySelector('video').srcObject).toBeFalsy();
  view.unmount();
  navigator.mediaDevices = undefined;
  const missing = render(<Webcam />);
  missing.unmount();
});

test('StrictMode stops the stale request and the current stream exactly once', async () => {
  const stops = [jest.fn(), jest.fn()];
  navigator.mediaDevices = { getUserMedia: jest.fn()
    .mockResolvedValueOnce({ getTracks: () => [{ stop: stops[0] }] })
    .mockResolvedValueOnce({ getTracks: () => [{ stop: stops[1] }] }) };
  const view = render(<React.StrictMode><Webcam audio={false} /></React.StrictMode>);
  await act(() => Promise.resolve());
  expect(stops[0]).toHaveBeenCalledTimes(1);
  expect(stops[1]).not.toHaveBeenCalled();
  view.unmount();
  expect(stops[1]).toHaveBeenCalledTimes(1);
});
