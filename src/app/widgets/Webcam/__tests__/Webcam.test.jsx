import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import Webcam from '@app/components/Webcam';
import log from '@app/lib/log';

jest.mock('@app/lib/log', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn() },
}));

const mediaError = name => Object.assign(new Error(name), { name });
const makeStream = () => {
  const stop = jest.fn();
  return { stop, stream: { getTracks: () => [{ stop }] } };
};
const exact = deviceId => ({ deviceId: { exact: deviceId } });
const legacyNames = ['getUserMedia', 'webkitGetUserMedia', 'mozGetUserMedia', 'msGetUserMedia'];
const legacyDescriptors = legacyNames.map(name => Object.getOwnPropertyDescriptor(navigator, name));

beforeEach(() => {
  navigator.mediaDevices = { getUserMedia: jest.fn() };
});

afterEach(() => {
  legacyNames.forEach((name, index) => {
    if (legacyDescriptors[index]) {
      Object.defineProperty(navigator, name, legacyDescriptors[index]);
    } else {
      delete navigator[name];
    }
  });
});

describe('Webcam media owner', () => {
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
    await waitFor(() => expect(stop).toHaveBeenCalledTimes(1));
  });

  test('releases the active stream on unmount', async () => {
    const stop = jest.fn();
    navigator.mediaDevices.getUserMedia.mockResolvedValue({ getTracks: () => [{ stop }] });
    const view = render(<Webcam audio={false} video />);
    await waitFor(() => expect(view.container.querySelector('video').srcObject).toBeTruthy());
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

    await waitFor(() => expect(view.container.querySelector('video').srcObject).toBeTruthy());
    view.rerender(<Webcam audio={false} video="second" />);
    await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2));

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
  await waitFor(() => expect(element.srcObject).toBe(current));
  await act(() => {
    resolveFirst({ getTracks: () => [{ stop: oldStop }] });
    return Promise.resolve();
  });
  await waitFor(() => expect(oldStop).toHaveBeenCalledTimes(1));
  expect(element.srcObject).toBe(current);
  view.unmount();
  expect(element.srcObject).toBeNull();
  expect(currentStop).toHaveBeenCalledTimes(1);
});

test('rejected requests and unavailable media APIs unmount safely', async () => {
  navigator.mediaDevices = { getUserMedia: jest.fn().mockRejectedValue(new Error('denied')) };
  const view = render(<Webcam />);
  await waitFor(() => expect(log.error).toHaveBeenCalledWith('Error: denied'));
  expect(view.container.querySelector('video').srcObject).toBeFalsy();
  view.unmount();
  navigator.mediaDevices = undefined;
  const missing = render(<Webcam />);
  expect(missing.container.querySelector('video').srcObject).toBeFalsy();
  missing.unmount();
});

test('StrictMode stops the stale request and the current stream exactly once', async () => {
  const stops = [jest.fn(), jest.fn()];
  navigator.mediaDevices = { getUserMedia: jest.fn()
    .mockResolvedValueOnce({ getTracks: () => [{ stop: stops[0] }] })
    .mockResolvedValueOnce({ getTracks: () => [{ stop: stops[1] }] }) };
  const view = render(<React.StrictMode><Webcam audio={false} /></React.StrictMode>);
  await waitFor(() => {
    expect(stops[0]).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector('video').srcObject).toBeTruthy();
  });
  expect(stops[1]).not.toHaveBeenCalled();
  view.unmount();
  expect(stops[1]).toHaveBeenCalledTimes(1);
});

describe('Webcam device constraints and fallbacks', () => {
  test('passes exact audio and video device IDs with the mediaDevices receiver', async () => {
    const { stream } = makeStream();
    const mediaDevices = navigator.mediaDevices;
    navigator.getUserMedia = jest.fn();
    mediaDevices.getUserMedia.mockResolvedValue(stream);
    const view = render(<Webcam audio="mic-a" video="camera-a" />);

    expect(mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: exact('mic-a'), video: exact('camera-a'),
    });
    expect(mediaDevices.getUserMedia.mock.contexts[0]).toBe(mediaDevices);
    expect(navigator.getUserMedia).not.toHaveBeenCalled();
    await waitFor(() => expect(view.container.querySelector('video').srcObject).toBe(stream));
    view.unmount();
  });

  test('preserves disabled video and empty or boolean constraints', async () => {
    const { stream } = makeStream();
    navigator.mediaDevices.getUserMedia.mockResolvedValue(stream);
    const view = render(<Webcam audio="" video={false} />);
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: false, video: false });
    await waitFor(() => expect(view.container.querySelector('video').srcObject).toBe(stream));
    view.rerender(<Webcam audio video />);
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenLastCalledWith({ audio: true, video: true });
    view.unmount();
  });

  test.each(['OverconstrainedError', 'NotFoundError'])(
    'falls back to the default camera for %s',
    async name => {
      const { stream } = makeStream();
      navigator.mediaDevices.getUserMedia
        .mockRejectedValueOnce(mediaError(name))
        .mockResolvedValueOnce(stream);
      const view = render(<Webcam audio="mic-a" video="camera-a" />);
      await waitFor(() => expect(view.container.querySelector('video').srcObject).toBe(stream));
      expect(navigator.mediaDevices.getUserMedia.mock.calls).toEqual([
        [{ audio: exact('mic-a'), video: exact('camera-a') }],
        [{ audio: exact('mic-a'), video: true }],
      ]);
      expect(log.warn).toHaveBeenCalledWith('Webcam: a media device is unavailable, trying the default camera');
      view.unmount();
    }
  );

  test.each(['NotAllowedError', 'NotReadableError', 'NotFoundError', 'OverconstrainedError'])(
    'tries video only for %s when audio and video were requested',
    async name => {
      const { stream } = makeStream();
      navigator.mediaDevices.getUserMedia
        .mockRejectedValueOnce(mediaError(name))
        .mockResolvedValueOnce(stream);
      const view = render(<Webcam audio="mic-a" video />);
      await waitFor(() => expect(view.container.querySelector('video').srcObject).toBe(stream));
      expect(navigator.mediaDevices.getUserMedia.mock.calls).toEqual([
        [{ audio: exact('mic-a'), video: true }],
        [{ audio: false, video: true }],
      ]);
      expect(log.warn).toHaveBeenCalledWith('Webcam: unable to open audio and video, trying video only');
      view.unmount();
    }
  );

  test('runs all four attempts from the original constraints and attaches the last stream', async () => {
    const { stream } = makeStream();
    navigator.mediaDevices.getUserMedia
      .mockRejectedValueOnce(mediaError('NotFoundError'))
      .mockRejectedValueOnce(mediaError('NotAllowedError'))
      .mockRejectedValueOnce(mediaError('OverconstrainedError'))
      .mockResolvedValueOnce(stream);
    const view = render(<Webcam audio="mic-a" video="camera-a" />);
    await waitFor(() => expect(view.container.querySelector('video').srcObject).toBe(stream));
    expect(navigator.mediaDevices.getUserMedia.mock.calls).toEqual([
      [{ audio: exact('mic-a'), video: exact('camera-a') }],
      [{ audio: exact('mic-a'), video: true }],
      [{ audio: false, video: exact('camera-a') }],
      [{ audio: false, video: true }],
    ]);
    view.unmount();
  });

  test('leaves no stream and logs the final error after all four attempts fail', async () => {
    navigator.mediaDevices.getUserMedia
      .mockRejectedValueOnce(mediaError('NotFoundError'))
      .mockRejectedValueOnce(mediaError('NotAllowedError'))
      .mockRejectedValueOnce(mediaError('NotFoundError'))
      .mockRejectedValueOnce(mediaError('NotReadableError'));
    const view = render(<Webcam audio video="camera-a" />);
    await waitFor(() => expect(log.error).toHaveBeenCalledWith('NotReadableError: NotReadableError'));
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(4);
    expect(view.container.querySelector('video').srcObject).toBeFalsy();
    view.unmount();
  });

  test('does not retry errors outside the fallback allowlist', async () => {
    navigator.mediaDevices.getUserMedia.mockRejectedValue(mediaError('AbortError'));
    const view = render(<Webcam audio video="camera-a" />);
    await waitFor(() => expect(log.error).toHaveBeenCalledWith('AbortError: AbortError'));
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector('video').srcObject).toBeFalsy();
    view.unmount();
  });

  test.each([
    { label: 'initial request', stage: 0, action: 'unmount' },
    { label: 'initial request', stage: 0, action: 'change' },
    { label: 'default camera', stage: 1, action: 'unmount' },
    { label: 'default camera', stage: 1, action: 'change' },
    { label: 'video only', stage: 2, action: 'unmount' },
    { label: 'video only', stage: 2, action: 'change' },
    { label: 'default video only', stage: 3, action: 'unmount' },
    { label: 'default video only', stage: 3, action: 'change' },
  ])('does not retry a stale $label failure after $action', async ({ stage, action }) => {
    let rejectPending;
    const pending = new Promise((resolve, reject) => {
      rejectPending = reject;
    });
    const errors = ['NotFoundError', 'NotAllowedError', 'NotFoundError'];
    const { stream: current, stop } = makeStream();
    let calls = 0;
    navigator.mediaDevices.getUserMedia.mockImplementation(() => {
      const index = calls++;
      if (index < stage) {
        return Promise.reject(mediaError(errors[index]));
      }
      return index === stage ? pending : Promise.resolve(current);
    });
    const view = render(<Webcam audio video="old-camera" />);
    const element = view.container.querySelector('video');
    await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(stage + 1));

    if (action === 'change') {
      view.rerender(<Webcam audio video="new-camera" />);
      await waitFor(() => expect(element.srcObject).toBe(current));
    } else {
      view.unmount();
    }
    const expectedCalls = stage + 1 + (action === 'change' ? 1 : 0);
    await act(async () => {
      rejectPending(mediaError('NotFoundError'));
      await Promise.resolve();
    });
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(expectedCalls);
    expect(log.error).not.toHaveBeenCalled();
    if (action === 'change') {
      expect(element.srcObject).toBe(current);
      expect(stop).not.toHaveBeenCalled();
      view.unmount();
      expect(stop).toHaveBeenCalledTimes(1);
    }
  });

  test('changing and unmounting one owner never changes another owner or its stream', async () => {
    const first = makeStream();
    const replacement = makeStream();
    const late = makeStream();
    const other = makeStream();
    let resolveLate;
    navigator.mediaDevices.getUserMedia
      .mockResolvedValueOnce(first.stream)
      .mockResolvedValueOnce(other.stream)
      .mockResolvedValueOnce(replacement.stream)
      .mockReturnValueOnce(new Promise(resolve => {
        resolveLate = resolve;
      }));
    const a = render(<Webcam audio={false} video="a1" />);
    const b = render(<Webcam audio={false} video="b" />);
    const aVideo = a.container.querySelector('video');
    const bVideo = b.container.querySelector('video');
    await waitFor(() => {
      expect(aVideo.srcObject).toBe(first.stream);
      expect(bVideo.srcObject).toBe(other.stream);
    });

    a.rerender(<Webcam audio={false} video="a2" />);
    await waitFor(() => expect(aVideo.srcObject).toBe(replacement.stream));
    expect(first.stop).toHaveBeenCalledTimes(1);
    expect(bVideo.srcObject).toBe(other.stream);
    expect(other.stop).not.toHaveBeenCalled();

    a.rerender(<Webcam audio={false} video="a3" />);
    expect(replacement.stop).toHaveBeenCalledTimes(1);
    a.unmount();
    await act(async () => {
      resolveLate(late.stream);
      await Promise.resolve();
    });
    await waitFor(() => expect(late.stop).toHaveBeenCalledTimes(1));
    expect(bVideo.srcObject).toBe(other.stream);
    expect(other.stop).not.toHaveBeenCalled();
    b.unmount();
    expect(other.stop).toHaveBeenCalledTimes(1);
  });

  test.each(legacyNames)('uses the legacy %s callback API and navigator receiver', async name => {
    navigator.mediaDevices = undefined;
    const stop = jest.fn();
    const stream = { stop };
    const legacy = jest.fn()
      .mockImplementationOnce((constraints, resolve, reject) => reject(mediaError('NotFoundError')))
      .mockImplementationOnce((constraints, resolve) => resolve(stream));
    navigator[name] = legacy;
    const view = render(<Webcam audio="mic-a" video="camera-a" />);
    await waitFor(() => expect(view.container.querySelector('video').srcObject).toBe(stream));
    expect(legacy.mock.calls.map(([constraints]) => constraints)).toEqual([
      { audio: exact('mic-a'), video: exact('camera-a') },
      { audio: exact('mic-a'), video: true },
    ]);
    expect(legacy.mock.contexts).toEqual([navigator, navigator]);
    view.unmount();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  test('legacy callback failures use the same audio fallback and final error handling', async () => {
    navigator.mediaDevices = undefined;
    navigator.getUserMedia = jest.fn()
      .mockImplementationOnce((constraints, resolve, reject) => reject(mediaError('NotAllowedError')))
      .mockImplementationOnce((constraints, resolve, reject) => reject(mediaError('NotReadableError')));
    const view = render(<Webcam audio video="camera-a" />);
    await waitFor(() => expect(log.error).toHaveBeenCalledWith('NotReadableError: NotReadableError'));
    expect(navigator.getUserMedia.mock.calls.map(([constraints]) => constraints)).toEqual([
      { audio: true, video: exact('camera-a') },
      { audio: false, video: exact('camera-a') },
    ]);
    expect(view.container.querySelector('video').srcObject).toBeFalsy();
    view.unmount();
  });
});
