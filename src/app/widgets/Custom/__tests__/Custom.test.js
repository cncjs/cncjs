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

const messagesOfType = (postMessage, type) => postMessage.mock.calls
  .map(([message]) => message)
  .filter(message => message.action.type === type);

afterEach(() => {
  mounted.splice(0).forEach(instance => instance.componentWillUnmount());
});

describe('fullscreen message', () => {
  test('tells the iframe when the widget enters full screen', () => {
    const { instance, postMessage } = mount();

    updateProps(instance, { fullscreen: true });

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({
      token: 'test-token',
      version: '1.2.3',
      action: {
        type: 'fullscreen',
        payload: { fullscreen: true }
      }
    }, '*');
  });

  test('tells the iframe when the widget leaves full screen', () => {
    const { instance, postMessage } = mount({ fullscreen: true });

    updateProps(instance, { fullscreen: false });

    expect(messagesOfType(postMessage, 'fullscreen')).toEqual([
      expect.objectContaining({ action: { type: 'fullscreen', payload: { fullscreen: false } } })
    ]);
  });

  test('sends one message per change across several toggles', () => {
    const { instance, postMessage } = mount();

    updateProps(instance, { fullscreen: true });
    updateProps(instance, { fullscreen: false });
    updateProps(instance, { fullscreen: true });

    expect(messagesOfType(postMessage, 'fullscreen').map(m => m.action.payload.fullscreen))
      .toEqual([true, false, true]);
  });

  test('does not send a fullscreen message when other props change', () => {
    const { instance, postMessage } = mount();

    updateProps(instance, { port: '/dev/ttyACM0' });
    updateProps(instance, { disabled: true });

    expect(messagesOfType(postMessage, 'fullscreen')).toHaveLength(0);
    expect(messagesOfType(postMessage, 'change')).toHaveLength(1);
  });

  test('sends a boolean even if the prop is not a strict boolean', () => {
    const { instance, postMessage } = mount({ fullscreen: undefined });

    updateProps(instance, { fullscreen: 1 });

    expect(messagesOfType(postMessage, 'fullscreen')[0].action.payload).toEqual({ fullscreen: true });
  });

  test('tells the iframe it left full screen when the widget is disabled while full screen', () => {
    // Disabling a full screen widget changes both props in the same update. The iframe is
    // still mounted at that point, so it gets the message before it is removed.
    const { instance, postMessage } = mount({ fullscreen: true });

    updateProps(instance, { disabled: true, fullscreen: false });

    expect(messagesOfType(postMessage, 'fullscreen').map(m => m.action.payload))
      .toEqual([{ fullscreen: false }]);
  });

  test('does nothing when there is no iframe (widget disabled or no URL)', () => {
    const { instance } = mount({ disabled: true }, { withIframe: false });

    expect(() => updateProps(instance, { fullscreen: true })).not.toThrow();
  });
});

describe('message:connect handshake', () => {
  test('sends the current fullscreen state after the change message', () => {
    const { postMessage } = mount({ fullscreen: true });

    pubsub.publishSync('message:connect');

    const types = postMessage.mock.calls.map(([message]) => message.action.type);
    expect(types).toEqual(['change', 'fullscreen']);
    expect(postMessage.mock.calls[0][0].action.payload).toEqual({ port: '/dev/ttyUSB0', controller: 'Grbl' });
    expect(postMessage.mock.calls[1][0].action.payload).toEqual({ fullscreen: true });
  });

  test('reports fullscreen: false when the widget is not full screen', () => {
    const { postMessage } = mount({ fullscreen: false });

    pubsub.publishSync('message:connect');

    expect(messagesOfType(postMessage, 'fullscreen')[0].action.payload).toEqual({ fullscreen: false });
  });

  test('reports the state as of the handshake, not as of mount', () => {
    const { instance, postMessage } = mount({ fullscreen: false });
    updateProps(instance, { fullscreen: true });
    postMessage.mockClear();

    pubsub.publishSync('message:connect');

    expect(messagesOfType(postMessage, 'fullscreen')[0].action.payload).toEqual({ fullscreen: true });
  });

  test('stops sending after unmount', () => {
    const { instance, postMessage } = mount();
    instance.componentWillUnmount();
    mounted.splice(mounted.indexOf(instance), 1);

    pubsub.publishSync('message:connect');

    expect(postMessage).not.toHaveBeenCalled();
  });
});
