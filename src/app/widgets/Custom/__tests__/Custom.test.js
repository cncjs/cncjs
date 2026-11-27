/* eslint-env jest */
jest.mock('app/config/settings', () => ({ version: '1.2.3' }));
jest.mock('app/store', () => ({
  get: jest.fn(key => (key === 'session.token' ? 'test-token' : undefined))
}));
jest.mock('app/components/Iframe', () => 'iframe');
jest.mock('app/lib/ResizeObserver', () => jest.fn());
jest.mock('app/lib/controller', () => ({ port: '/dev/ttyUSB0', type: 'Grbl' }));
jest.mock('app/lib/i18n', () => ({ _: text => text }));
jest.mock('app/lib/log', () => ({ error: jest.fn() }));
jest.mock('../index.styl', () => ({ inactiveContent: 'inactive-content' }));

const pubsub = require('pubsub-js');
const controller = require('app/lib/controller');
const Custom = require('../Custom').default;

const defaultProps = {
  config: {},
  disabled: false,
  fullscreen: false,
  url: 'http://localhost:8000/widget/',
  port: '/dev/ttyUSB0'
};

const mounted = [];

// Create the component without rendering it and give it a fake iframe window.
const mount = (props = {}) => {
  const instance = new Custom({ ...defaultProps, ...props });
  const postMessage = jest.fn();
  instance.iframe = { contentWindow: { postMessage } };
  instance.componentDidMount();
  mounted.push(instance);
  return { instance, postMessage };
};

// Same order React uses: componentWillReceiveProps sees the old props on this.props
const updateProps = (instance, changes) => {
  const nextProps = { ...instance.props, ...changes };
  instance.componentWillReceiveProps(nextProps);
  instance.props = nextProps;
};

const sent = postMessage => postMessage.mock.calls.map(([message]) => message);
const fullscreenValues = postMessage => sent(postMessage).map(message => message.action.payload.fullscreen);

afterEach(() => {
  mounted.splice(0).forEach(instance => instance.componentWillUnmount());
  controller.port = '/dev/ttyUSB0';
  controller.type = 'Grbl';
});

describe('widget notifications', () => {
  test('entering full screen sends a fullscreenchange event without a port change', () => {
    const { instance, postMessage } = mount();

    updateProps(instance, { fullscreen: true });

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({
      token: 'test-token',
      version: '1.2.3',
      action: {
        type: 'widget:fullscreenchange',
        payload: { fullscreen: true }
      }
    }, '*');
  });

  test('sends one message per full screen change', () => {
    const { instance, postMessage } = mount();

    updateProps(instance, { fullscreen: true });
    updateProps(instance, { fullscreen: false });
    updateProps(instance, { fullscreen: true });

    expect(fullscreenValues(postMessage)).toEqual([true, false, true]);
  });

  test('still notifies the iframe when the port changes', () => {
    const { instance, postMessage } = mount({ port: '' });
    controller.port = '/dev/ttyACM0';

    updateProps(instance, { port: '/dev/ttyACM0' });

    expect(sent(postMessage)).toHaveLength(1);
    expect(sent(postMessage)[0].action).toEqual({
      type: 'change',
      payload: { port: '/dev/ttyACM0', controller: 'Grbl' }
    });
  });

  test('sends separate events when the port and full screen change together', () => {
    const { instance, postMessage } = mount({ port: '' });

    updateProps(instance, { port: '/dev/ttyUSB0', fullscreen: true });

    expect(sent(postMessage).map(message => message.action)).toEqual([
      { type: 'change', payload: { port: '/dev/ttyUSB0', controller: 'Grbl' } },
      { type: 'widget:fullscreenchange', payload: { fullscreen: true } }
    ]);
  });

  test('sends nothing when no relevant prop changes', () => {
    const { instance, postMessage } = mount();

    updateProps(instance, { config: { other: true } });
    updateProps(instance, { fullscreen: false });

    expect(postMessage).not.toHaveBeenCalled();
  });

  test('sends nothing when full screen only changes between equivalent values', () => {
    const { instance, postMessage } = mount({ fullscreen: undefined });

    updateProps(instance, { fullscreen: false });

    expect(postMessage).not.toHaveBeenCalled();
  });

  test('sends full screen as a boolean', () => {
    const { instance, postMessage } = mount({ fullscreen: undefined });

    updateProps(instance, { fullscreen: 1 });

    expect(fullscreenValues(postMessage)).toEqual([true]);
  });

  test('does not send a full screen update when disabling removes the iframe', () => {
    const { instance, postMessage } = mount({ fullscreen: true });

    updateProps(instance, { disabled: true, fullscreen: false });

    expect(postMessage).not.toHaveBeenCalled();
  });
});

describe('message:connect handshake', () => {
  test.each([false, true])('reports fullscreen=%s without emitting a transition', fullscreen => {
    const { postMessage } = mount({ fullscreen });

    pubsub.publishSync('message:connect');

    expect(sent(postMessage).map(message => message.action)).toEqual([
      { type: 'change', payload: { port: '/dev/ttyUSB0', controller: 'Grbl', fullscreen } }
    ]);
  });

  test('reports the full screen state as of the handshake, not as of mount', () => {
    const { instance, postMessage } = mount();
    updateProps(instance, { fullscreen: true });
    postMessage.mockClear();

    pubsub.publishSync('message:connect');

    expect(fullscreenValues(postMessage)).toEqual([true]);
  });

  test('stops sending after unmount', () => {
    const { instance, postMessage } = mount();
    instance.componentWillUnmount();
    mounted.splice(mounted.indexOf(instance), 1);

    pubsub.publishSync('message:connect');

    expect(postMessage).not.toHaveBeenCalled();
  });
});
