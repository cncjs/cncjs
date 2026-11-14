/* eslint-env jest */
jest.mock('app/lib/log', () => ({
  warn: jest.fn(),
  error: jest.fn()
}));

const originalNavigator = Object.getOwnPropertyDescriptor(global, 'navigator');
Object.defineProperty(global, 'navigator', {
  configurable: true,
  value: { mediaDevices: { getUserMedia: jest.fn() } }
});

const Webcam = require('../Webcam').default;

const flush = () => new Promise(resolve => {
  setImmediate(resolve);
});
const mediaError = name => Object.assign(new Error(name), { name });
const createStream = () => {
  const videoTrack = { stop: jest.fn() };
  const audioTrack = { stop: jest.fn() };
  return {
    videoTrack,
    audioTrack,
    getVideoTracks: () => [videoTrack],
    getAudioTracks: () => [audioTrack]
  };
};

const mount = (props = {}) => {
  const instance = new Webcam({ ...Webcam.defaultProps, ...props });
  instance.video = { srcObject: null };
  instance.setState = (update) => {
    instance.state = { ...instance.state, ...update };
    instance.componentDidUpdate(instance.props);
  };
  instance.componentDidMount();
  return instance;
};

const selectVideo = (instance, video) => {
  const previous = instance.props;
  instance.props = { ...previous, video };
  instance.componentDidUpdate(previous);
};

beforeEach(() => {
  navigator.mediaDevices.getUserMedia.mockReset();
  Webcam.mountedInstances = [];
  Webcam.stream = null;
  Webcam.userMediaRequested = false;
  Webcam.requestToken = 0;
  Webcam.getUserMedia = undefined;
});

afterAll(() => {
  if (originalNavigator) {
    Object.defineProperty(global, 'navigator', originalNavigator);
  } else {
    delete global.navigator;
  }
});

test('selects the requested camera and switches streams without remounting', async () => {
  const first = createStream();
  const second = createStream();
  navigator.mediaDevices.getUserMedia.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
  const instance = mount({ video: 'camera-a' });
  await flush();

  expect(navigator.mediaDevices.getUserMedia).toHaveBeenNthCalledWith(1, {
    audio: true, video: { deviceId: { exact: 'camera-a' } }
  });
  expect(instance.video.srcObject).toBe(first);

  selectVideo(instance, 'camera-b');
  await flush();
  expect(first.videoTrack.stop).toHaveBeenCalledTimes(1);
  expect(first.audioTrack.stop).toHaveBeenCalledTimes(1);
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenNthCalledWith(2, {
    audio: true, video: { deviceId: { exact: 'camera-b' } }
  });
  expect(instance.video.srcObject).toBe(second);
  instance.componentWillUnmount();
});

test('does not retry an unavailable camera after the last instance unmounts', async () => {
  let rejectRequest;
  navigator.mediaDevices.getUserMedia.mockImplementation(() => new Promise((resolve, reject) => {
    rejectRequest = reject;
  }));
  const instance = mount({ video: 'missing' });
  instance.componentWillUnmount();
  rejectRequest(mediaError('NotFoundError'));
  await flush();
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
});

test('does not retry a request superseded by a camera selection', async () => {
  let rejectOld;
  const current = createStream();
  navigator.mediaDevices.getUserMedia
    .mockImplementationOnce(() => new Promise((resolve, reject) => {
      rejectOld = reject;
    }))
    .mockResolvedValueOnce(current);
  const instance = mount({ video: 'old' });
  selectVideo(instance, 'new');
  rejectOld(mediaError('NotFoundError'));
  await flush();
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2);
  expect(instance.video.srcObject).toBe(current);
  instance.componentWillUnmount();
});

test('stops a late stream without replacing the current camera', async () => {
  let resolveOld;
  const old = createStream();
  const current = createStream();
  navigator.mediaDevices.getUserMedia
    .mockImplementationOnce(() => new Promise(resolve => {
      resolveOld = resolve;
    }))
    .mockResolvedValueOnce(current);
  const instance = mount({ video: 'old' });
  selectVideo(instance, 'new');
  await flush();
  resolveOld(old);
  await flush();
  expect(old.videoTrack.stop).toHaveBeenCalledTimes(1);
  expect(old.audioTrack.stop).toHaveBeenCalledTimes(1);
  expect(instance.video.srcObject).toBe(current);
  expect(current.videoTrack.stop).not.toHaveBeenCalled();
  instance.componentWillUnmount();
});

test('keeps the selected camera when no microphone exists', async () => {
  const stream = createStream();
  navigator.mediaDevices.getUserMedia.mockImplementation(constraints => {
    if (constraints.audio) {
      return Promise.reject(mediaError('NotFoundError'));
    }
    return Promise.resolve(stream);
  });
  const instance = mount({ video: 'camera-b' });
  await flush();
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenLastCalledWith({
    audio: false, video: { deviceId: { exact: 'camera-b' } }
  });
  expect(instance.video.srcObject).toBe(stream);
  instance.componentWillUnmount();
});

test('tries video alone when microphone permission is denied', async () => {
  const stream = createStream();
  navigator.mediaDevices.getUserMedia
    .mockRejectedValueOnce(mediaError('NotAllowedError'))
    .mockResolvedValueOnce(stream);
  const instance = mount({ video: 'camera-b' });
  await flush();
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenLastCalledWith({
    audio: false, video: { deviceId: { exact: 'camera-b' } }
  });
  expect(instance.video.srcObject).toBe(stream);
  instance.componentWillUnmount();
});

test('falls back to the default camera when the selected camera is missing', async () => {
  const stream = createStream();
  navigator.mediaDevices.getUserMedia
    .mockRejectedValueOnce(mediaError('NotFoundError'))
    .mockResolvedValueOnce(stream);
  const instance = mount({ video: 'missing' });
  await flush();
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenLastCalledWith({ audio: true, video: true });
  expect(instance.video.srcObject).toBe(stream);
  instance.componentWillUnmount();
});

test('falls back to the default camera without audio when both devices are unavailable', async () => {
  const stream = createStream();
  navigator.mediaDevices.getUserMedia.mockImplementation(constraints => {
    if (constraints.audio || constraints.video !== true) {
      return Promise.reject(mediaError('NotFoundError'));
    }
    return Promise.resolve(stream);
  });
  const instance = mount({ video: 'missing' });
  await flush();
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenLastCalledWith({ audio: false, video: true });
  expect(instance.video.srcObject).toBe(stream);
  instance.componentWillUnmount();
});

test('does not retry permission errors when audio is already disabled', async () => {
  navigator.mediaDevices.getUserMedia.mockRejectedValue(mediaError('NotAllowedError'));
  const instance = mount({ audio: false, video: 'camera-b' });
  await flush();
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
  expect(instance.video.srcObject).toBe(null);
  instance.componentWillUnmount();
});

test.each([true, false])('releases the shared stream after the last instance closes (first closes first: %s)', async (firstClosesFirst) => {
  const stream = createStream();
  navigator.mediaDevices.getUserMedia.mockResolvedValue(stream);
  const first = mount();
  await flush();
  const second = mount();
  expect(second.video.srcObject).toBe(stream);
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
  const closingFirst = firstClosesFirst ? first : second;
  const closingLast = firstClosesFirst ? second : first;
  closingFirst.componentWillUnmount();
  expect(stream.videoTrack.stop).not.toHaveBeenCalled();
  closingLast.componentWillUnmount();
  expect(stream.videoTrack.stop).toHaveBeenCalledTimes(1);
  expect(stream.audioTrack.stop).toHaveBeenCalledTimes(1);

  const reopened = mount();
  await flush();
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2);
  expect(reopened.video.srcObject).toBe(stream);
  reopened.componentWillUnmount();
});

test('uses the callback API if mediaDevices is unavailable', async () => {
  const stream = createStream();
  const mediaDevices = navigator.mediaDevices;
  navigator.mediaDevices = undefined;
  Webcam.getUserMedia = jest.fn((constraints, resolve) => resolve(stream));
  const instance = mount({ video: 'camera-b' });
  await flush();
  expect(Webcam.getUserMedia).toHaveBeenCalledWith({
    audio: true, video: { deviceId: { exact: 'camera-b' } }
  }, expect.any(Function), expect.any(Function));
  expect(instance.video.srcObject).toBe(stream);
  instance.componentWillUnmount();
  navigator.mediaDevices = mediaDevices;
});
