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
  colorMode: 'light',
  url: 'http://localhost:8000/widget/',
  port: '/dev/ttyUSB0'
};

const mounted = [];

// Create the component without rendering it and give it a fake iframe window.
// Pass { withIframe: false } for the disabled / no-URL case, where no iframe is mounted.
const mount = (props = {}, { withIframe = true } = {}) => {
  const instance = new Custom({ ...defaultProps, ...props });
  const postMessage = jest.fn();
  instance.iframe = withIframe ? { contentWindow: { postMessage } } : null;
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
const sentProps = postMessage => sent(postMessage).map(message => message.action.payload.props);

afterEach(() => {
  mounted.splice(0).forEach(instance => instance.componentWillUnmount());
  controller.port = '/dev/ttyUSB0';
  controller.type = 'Grbl';
});

describe('change message', () => {
  test('sends the full message when the widget enters full screen', () => {
    const { instance, postMessage } = mount();

    updateProps(instance, { fullscreen: true });

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({
      token: 'test-token',
      version: '1.2.3',
      action: {
        type: 'change',
        payload: {
          port: '/dev/ttyUSB0',
          controller: 'Grbl',
          props: { disabled: false, fullscreen: true, colorMode: 'light' }
        }
      }
    }, '*');
  });

  test('sends one message per full screen change', () => {
    const { instance, postMessage } = mount();

    updateProps(instance, { fullscreen: true });
    updateProps(instance, { fullscreen: false });
    updateProps(instance, { fullscreen: true });

    expect(sentProps(postMessage).map(props => props.fullscreen)).toEqual([true, false, true]);
  });

  test('sends the new color mode when it changes', () => {
    const { instance, postMessage } = mount();

    updateProps(instance, { colorMode: 'dark' });

    expect(sentProps(postMessage)).toEqual([{ disabled: false, fullscreen: false, colorMode: 'dark' }]);
  });

  test('still notifies the iframe when the port changes', () => {
    const { instance, postMessage } = mount({ port: '' });
    controller.port = '/dev/ttyACM0';

    updateProps(instance, { port: '/dev/ttyACM0' });

    expect(sent(postMessage)).toHaveLength(1);
    expect(sent(postMessage)[0].action.payload).toMatchObject({
      port: '/dev/ttyACM0',
      controller: 'Grbl',
      props: { disabled: false, fullscreen: false, colorMode: 'light' }
    });
  });

  test('sends a single message when the port and a prop change together', () => {
    const { instance, postMessage } = mount({ port: '' });

    updateProps(instance, { port: '/dev/ttyUSB0', fullscreen: true });

    expect(sent(postMessage)).toHaveLength(1);
  });

  test('sends nothing when no relevant prop changes', () => {
    const { instance, postMessage } = mount();

    updateProps(instance, { config: { other: true } });
    updateProps(instance, { fullscreen: false, colorMode: 'light' });

    expect(postMessage).not.toHaveBeenCalled();
  });

  test('sends nothing when a prop only changes between equivalent values', () => {
    const { instance, postMessage } = mount({ fullscreen: undefined, disabled: undefined });

    updateProps(instance, { fullscreen: false, disabled: false });

    expect(postMessage).not.toHaveBeenCalled();
  });

  test('sends booleans even if the props are not strict booleans', () => {
    const { instance, postMessage } = mount({ fullscreen: undefined });

    updateProps(instance, { fullscreen: 1 });

    expect(sentProps(postMessage)[0]).toEqual({ disabled: false, fullscreen: true, colorMode: 'light' });
  });

  test('tells the iframe it left full screen when the widget is disabled while full screen', () => {
    // Disabling a full screen widget changes both props in the same update. The iframe is
    // still mounted at that point, so it gets the message before it is removed.
    const { instance, postMessage } = mount({ fullscreen: true });

    updateProps(instance, { disabled: true, fullscreen: false });

    expect(sentProps(postMessage)).toEqual([{ disabled: true, fullscreen: false, colorMode: 'light' }]);
  });

  test('does nothing when there is no iframe (widget disabled or no URL)', () => {
    const { instance } = mount({ disabled: true }, { withIframe: false });

    expect(() => updateProps(instance, { fullscreen: true, colorMode: 'dark' })).not.toThrow();
  });
});

describe('message:connect handshake', () => {
  test('sends a single change message with the current props', () => {
    const { postMessage } = mount({ fullscreen: true, colorMode: 'dark' });

    pubsub.publishSync('message:connect');

    expect(sent(postMessage)).toHaveLength(1);
    expect(sent(postMessage)[0].action).toEqual({
      type: 'change',
      payload: {
        port: '/dev/ttyUSB0',
        controller: 'Grbl',
        props: { disabled: false, fullscreen: true, colorMode: 'dark' }
      }
    });
  });

  test('reports the props as of the handshake, not as of mount', () => {
    const { instance, postMessage } = mount();
    updateProps(instance, { fullscreen: true, colorMode: 'dark' });
    postMessage.mockClear();

    pubsub.publishSync('message:connect');

    expect(sentProps(postMessage)).toEqual([{ disabled: false, fullscreen: true, colorMode: 'dark' }]);
  });

  test('stops sending after unmount', () => {
    const { instance, postMessage } = mount();
    instance.componentWillUnmount();
    mounted.splice(mounted.indexOf(instance), 1);

    pubsub.publishSync('message:connect');

    expect(postMessage).not.toHaveBeenCalled();
  });
});
