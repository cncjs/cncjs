import React, { useState } from 'react';
import { act, render } from '@testing-library/react';
import pubsub from 'pubsub-js';
import { UPDATE_BOUNDING_BOX } from '@app/actions/controller';
import * as WebGL from '@app/lib/three/WebGL';
import config from '@app/store/config';
import { renderAppUI } from '@app/test/render';
import Visualizer from '../Visualizer';
import useVisualizer from '../useVisualizer';
import { createVisualizerEngine } from '../VisualizerEngine';

const mockEngine = {
  dispose: jest.fn(),
  hideProbe: jest.fn(),
  load: jest.fn(() => ({
    bbox: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 1, y: 1, z: 1 },
    },
  })),
  lookAtCenter: jest.fn(),
  panDown: jest.fn(),
  panLeft: jest.fn(),
  panRight: jest.fn(),
  panUp: jest.fn(),
  resize: jest.fn(),
  showProbe: jest.fn(),
  to3DView: jest.fn(),
  toFrontView: jest.fn(),
  toLeftSideView: jest.fn(),
  toRightSideView: jest.fn(),
  toTopView: jest.fn(),
  unload: jest.fn(),
  update: jest.fn(),
  zoomFit: jest.fn(),
  zoomIn: jest.fn(),
  zoomOut: jest.fn(),
};

const controllerListeners = {};
const mockController = {
  addListener: jest.fn((eventName, listener) => {
    controllerListeners[eventName] = listener;
  }),
  command: jest.fn(),
  connection: { ident: 'connection' },
  context: {},
  removeListener: jest.fn(),
  settings: {},
  state: {},
  type: '',
  workflow: { state: '' },
};

jest.mock('../VisualizerEngine', () => ({
  createVisualizerEngine: jest.fn(),
}));

jest.mock('@app/store/config', () => ({
  __esModule: true,
  default: {
    get: jest.fn((path, defaultValue) => {
      if (path === 'workspace.machineProfile') {
        return { id: 'profile-a' };
      }
      return defaultValue;
    }),
    on: jest.fn(),
    removeListener: jest.fn(),
    set: jest.fn(),
    unset: jest.fn(),
    updater: jest.fn(),
  },
}));

jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: mockController,
}));

jest.mock('@app/store/redux', () => ({
  __esModule: true,
  default: { dispatch: jest.fn() },
}));

jest.mock('@app/lib/portal', () => jest.fn());

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: {
    _: value => value,
    t: value => value,
  },
}));

jest.mock('@app/lib/three/WebGL', () => ({
  isWebGLAvailable: jest.fn(() => true),
}));

jest.mock('pubsub-js', () => ({
  __esModule: true,
  default: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

const controller = require('@app/lib/controller').default;
const reduxStore = require('@app/store/redux').default;
const VisualizerWidget = require('../index').default;

const viewState = {
  cameraMode: 'rotate',
  cameraPosition: '3d',
  isAgitated: false,
  machinePosition: { x: 0, y: 0, z: 0 },
  objects: {
    coordinateSystem: { visible: false },
    cuttingTool: { visible: false },
    gridLineNumbers: { visible: false },
    limits: { visible: true },
  },
  projection: 'perspective',
  sent: 0,
  show: true,
  units: 'metric',
  workPosition: { x: 0, y: 0, z: 0 },
};

let latestHook;

function Harness({ mount = true, state = viewState }) {
  latestHook = useVisualizer({
    onError: jest.fn(),
    viewState: state,
  });

  return mount ? <div ref={latestHook.containerRef} /> : null;
}

describe('useVisualizer', () => {
  let pubsubSubscriptions;
  let windowAddEventListener;
  let windowRemoveEventListener;

  beforeEach(() => {
    jest.clearAllMocks();
    WebGL.isWebGLAvailable.mockReturnValue(true);
    createVisualizerEngine.mockReturnValue(mockEngine);
    config.get.mockImplementation((path, defaultValue) => {
      if (path === 'workspace.machineProfile') {
        return { id: 'profile-a' };
      }
      return defaultValue;
    });
    Object.keys(controllerListeners).forEach(eventName => delete controllerListeners[eventName]);
    controller.context = {};
    pubsubSubscriptions = [];
    pubsub.subscribe.mockImplementation((eventName, listener) => {
      const token = { eventName, listener };
      pubsubSubscriptions.push(token);
      return token;
    });
    windowAddEventListener = jest.spyOn(window, 'addEventListener');
    windowRemoveEventListener = jest.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    windowAddEventListener.mockRestore();
    windowRemoveEventListener.mockRestore();
  });

  test('waits for a host before creating one engine and updates it without recreation', () => {
    const { rerender, unmount } = render(<Harness mount={false} />);

    expect(createVisualizerEngine).not.toHaveBeenCalled();
    expect(latestHook.isReady).toBe(false);
    latestHook.actions.zoomFit();
    expect(mockEngine.zoomFit).not.toHaveBeenCalled();

    rerender(<Harness state={{ ...viewState, sent: 2 }} />);

    expect(createVisualizerEngine).toHaveBeenCalledTimes(1);
    expect(latestHook.isReady).toBe(true);
    expect(createVisualizerEngine).toHaveBeenCalledWith(expect.objectContaining({
      viewState: expect.objectContaining({ sent: 2 }),
    }));

    rerender(<Harness state={{ ...viewState, sent: 3 }} />);
    expect(createVisualizerEngine).toHaveBeenCalledTimes(1);
    expect(mockEngine.update).toHaveBeenCalledWith(expect.objectContaining({ sent: 3 }));

    unmount();
    expect(mockEngine.dispose).toHaveBeenCalledTimes(1);
  });

  test('subscribes to the profile and four visualizer events, then pairs every cleanup', () => {
    const { unmount } = render(<Harness />);

    expect(config.on).toHaveBeenCalledWith('change', expect.any(Function));
    expect(pubsubSubscriptions.map(subscription => subscription.eventName)).toEqual([
      'resize',
      'autolevel:showProbeVisualization',
      'autolevel:hideProbeVisualization',
      'autolevel:updateProbeVisualization',
    ]);
    expect(windowAddEventListener).toHaveBeenCalledWith('resize', expect.any(Function));

    const configListener = config.on.mock.calls[0][1];
    config.get.mockReturnValue({ id: 'profile-b' });
    act(() => configListener());
    expect(mockEngine.update).toHaveBeenCalledWith({ machineProfile: { id: 'profile-b' } });

    act(() => {
      pubsubSubscriptions.find(item => item.eventName === 'resize').listener();
      pubsubSubscriptions.find(item => item.eventName === 'autolevel:showProbeVisualization').listener('event', { probeData: [] });
      pubsubSubscriptions.find(item => item.eventName === 'autolevel:hideProbeVisualization').listener();
      pubsubSubscriptions.find(item => item.eventName === 'autolevel:updateProbeVisualization').listener('event', { probeData: [] });
    });
    expect(mockEngine.resize).toHaveBeenCalled();
    expect(mockEngine.showProbe).toHaveBeenCalledWith({ probeData: [] });
    expect(mockEngine.hideProbe).toHaveBeenCalled();

    const resizeListener = windowAddEventListener.mock.calls.find(([name]) => name === 'resize')[1];
    act(() => resizeListener());
    unmount();

    expect(config.removeListener).toHaveBeenCalledWith('change', configListener);
    expect(pubsub.unsubscribe).toHaveBeenCalledTimes(4);
    expect(windowRemoveEventListener).toHaveBeenCalledWith('resize', resizeListener);
    expect(mockEngine.dispose).toHaveBeenCalledTimes(1);
  });

  test('cancels a pending 32ms resize throttle on unmount', () => {
    jest.useFakeTimers();
    try {
      const { unmount } = render(<Harness />);
      const resizeListener = windowAddEventListener.mock.calls.find(([name]) => name === 'resize')[1];

      resizeListener();
      resizeListener();
      expect(mockEngine.resize).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(1);

      unmount();
      jest.advanceTimersByTime(32);

      expect(mockEngine.resize).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  test('reuses the renderer across show toggles and disposes each route instance once', () => {
    const firstEngine = { ...mockEngine, dispose: jest.fn() };
    const secondEngine = { ...mockEngine, dispose: jest.fn() };
    createVisualizerEngine
      .mockReturnValueOnce(firstEngine)
      .mockReturnValueOnce(secondEngine);

    const firstRoute = render(<Harness />);
    const oldHost = firstRoute.container.firstChild;
    firstRoute.rerender(<Harness state={{ ...viewState, show: false }} />);

    expect(createVisualizerEngine).toHaveBeenCalledTimes(1);
    expect(firstEngine.update).toHaveBeenCalledWith(expect.objectContaining({ show: false }));

    firstRoute.unmount();
    expect(firstEngine.dispose).toHaveBeenCalledTimes(1);
    expect(oldHost.parentNode).toBeNull();

    const secondRoute = render(<Harness />);
    expect(createVisualizerEngine).toHaveBeenCalledTimes(2);
    secondRoute.unmount();
    expect(secondEngine.dispose).toHaveBeenCalledTimes(1);
  });

  test('returns active engines to zero after 20 mount and unmount cycles', () => {
    const engines = [];
    createVisualizerEngine.mockImplementation(() => {
      const engine = { ...mockEngine, dispose: jest.fn() };
      engines.push(engine);
      return engine;
    });

    for (let index = 0; index < 20; ++index) {
      const route = render(<Harness />);
      route.unmount();
    }

    expect(engines).toHaveLength(20);
    expect(engines.filter(engine => engine.dispose.mock.calls.length === 0)).toHaveLength(0);
    engines.forEach(engine => {
      expect(engine.dispose).toHaveBeenCalledTimes(1);
    });
  });

  test('pairs StrictMode engine setup and cleanup without leaving an active engine', () => {
    const engines = [];
    createVisualizerEngine.mockImplementation(() => {
      const engine = { ...mockEngine, dispose: jest.fn() };
      engines.push(engine);
      return engine;
    });

    const route = render(
      <React.StrictMode>
        <Harness />
      </React.StrictMode>,
    );

    expect(engines.length).toBeGreaterThanOrEqual(1);
    expect(engines.filter(engine => engine.dispose.mock.calls.length === 0)).toHaveLength(1);
    route.unmount();
    expect(engines.filter(engine => engine.dispose.mock.calls.length === 0)).toHaveLength(0);
    engines.forEach(engine => {
      expect(engine.dispose).toHaveBeenCalledTimes(1);
    });
  });

  test('keeps action identities stable while reading the latest engine ref', () => {
    function StatefulHarness() {
      const [value, setValue] = useState(0);
      const hook = useVisualizer({ viewState: { ...viewState, sent: value } });
      latestHook = hook;
      return (
        <>
          <div ref={hook.containerRef} />
          <button type="button" onClick={() => setValue(1)}>update</button>
        </>
      );
    }

    const { getByRole } = render(<StatefulHarness />);
    const actions = latestHook.actions;
    act(() => getByRole('button', { name: 'update' }).click());

    expect(latestHook.actions).toBe(actions);
    latestHook.actions.zoomIn(0.2);
    expect(mockEngine.zoomIn).toHaveBeenCalledWith(0.2);
  });

  test('renders a DOM-only host through the supplied ref', () => {
    const containerRef = jest.fn();
    const { container, unmount } = render(
      <Visualizer
        containerRef={containerRef}
        show={false}
        state={viewState}
      />
    );

    const host = container.querySelector('[aria-label="3D Visualizer"]');
    expect(host).toBeInTheDocument();
    expect(host).toHaveStyle({ visibility: 'hidden' });
    expect(containerRef).toHaveBeenCalledWith(host);

    unmount();
  });

  test('renders the DOM host even when WebGL is unavailable', () => {
    WebGL.isWebGLAvailable.mockReturnValue(false);
    const containerRef = jest.fn();
    const { container, unmount } = render(
      <Visualizer containerRef={containerRef} show />
    );

    const host = container.querySelector('[aria-label="3D Visualizer"]');
    expect(host).toBeInTheDocument();
    expect(containerRef).toHaveBeenCalledWith(host);

    unmount();
  });

  test('loads ready G-code synchronously and publishes one bounding-box update', () => {
    const bbox = {
      min: { x: 10, y: 20, z: -2 },
      max: { x: 50, y: 60, z: 0 },
    };
    mockEngine.load.mockReturnValue({ bbox });
    reduxStore.dispatch.mockClear();

    const { unmount } = renderAppUI(<VisualizerWidget widgetId="visualizer" />);
    act(() => {
      controllerListeners['sender:load']({
        name: 'rectangle.gcode',
        content: 'G21\nG90\nM2',
      }, {});
    });

    expect(mockEngine.load).toHaveBeenCalledWith({
      name: 'rectangle.gcode',
      content: 'G21\nG90\nM2',
    });
    expect(controller.context).toMatchObject({
      xmin: 10,
      xmax: 50,
      ymin: 20,
      ymax: 60,
      zmin: -2,
      zmax: 0,
    });
    expect(reduxStore.dispatch).toHaveBeenCalledTimes(1);
    expect(reduxStore.dispatch).toHaveBeenCalledWith({
      type: UPDATE_BOUNDING_BOX,
      payload: { boundingBox: bbox },
    });

    unmount();
  });
});
