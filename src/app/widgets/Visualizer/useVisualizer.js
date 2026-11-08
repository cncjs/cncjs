import _throttle from 'lodash/throttle';
import pubsub from 'pubsub-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import config from '@app/store/config';
import { createVisualizerEngine } from './VisualizerEngine';

const readMachineProfile = () => config.get('workspace.machineProfile');

/**
 * @param {{
 *   onError?: (error: Error) => void,
 *   viewState?: object,
 * }} options
 * @returns {{
 *   actions: object,
 *   containerRef: (node: HTMLElement | null) => void,
 *   isReady: boolean,
 * }}
 */
function useVisualizer({ onError, viewState = {} } = {}) {
  const [container, setContainer] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const engineRef = useRef(null);
  const onErrorRef = useRef(onError);
  const viewStateRef = useRef(viewState);

  onErrorRef.current = onError;
  viewStateRef.current = viewState;

  const containerRef = useCallback(node => {
    setContainer(node);
  }, []);

  const callEngine = useCallback((method, ...args) => {
    const engine = engineRef.current;
    if (!engine || typeof engine[method] !== 'function') {
      return undefined;
    }
    return engine[method](...args);
  }, []);

  const actions = useMemo(() => ({
    hideProbe: () => callEngine('hideProbe'),
    load: document => callEngine('load', document),
    lookAtCenter: () => callEngine('lookAtCenter'),
    panDown: () => callEngine('panDown'),
    panLeft: () => callEngine('panLeft'),
    panRight: () => callEngine('panRight'),
    panUp: () => callEngine('panUp'),
    resize: () => callEngine('resize'),
    showProbe: data => callEngine('showProbe', data),
    to3DView: () => callEngine('to3DView'),
    toFrontView: () => callEngine('toFrontView'),
    toLeftSideView: () => callEngine('toLeftSideView'),
    toRightSideView: () => callEngine('toRightSideView'),
    toTopView: () => callEngine('toTopView'),
    unload: () => callEngine('unload'),
    update: nextViewState => callEngine('update', nextViewState),
    updateProbe: data => callEngine('updateProbe', data),
    zoomFit: () => callEngine('zoomFit'),
    zoomIn: delta => callEngine('zoomIn', delta),
    zoomOut: delta => callEngine('zoomOut', delta),
  }), [callEngine]);

  useEffect(() => {
    if (!container) {
      return undefined;
    }

    let engine;
    try {
      engine = createVisualizerEngine({
        container,
        onError: error => {
          if (typeof onErrorRef.current === 'function') {
            onErrorRef.current(error);
          }
        },
        viewState: {
          ...viewStateRef.current,
          machineProfile: readMachineProfile(),
        },
      });
    } catch (error) {
      if (typeof onErrorRef.current === 'function') {
        onErrorRef.current(error);
      }
      return undefined;
    }

    engineRef.current = engine;
    setIsReady(true);

    return () => {
      if (engineRef.current === engine) {
        engineRef.current = null;
        setIsReady(false);
      }
      if (engine && typeof engine.dispose === 'function') {
        engine.dispose();
      }
    };
  }, [container]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.update({
        ...viewState,
        machineProfile: readMachineProfile(),
      });
    }
  }, [viewState]);

  useEffect(() => {
    const onConfigChange = () => {
      if (engineRef.current) {
        engineRef.current.update({ machineProfile: readMachineProfile() });
      }
    };
    const resize = _throttle(() => {
      if (engineRef.current) {
        engineRef.current.resize();
      }
    }, 32);

    const subscriptions = [
      pubsub.subscribe('resize', () => actions.resize()),
      pubsub.subscribe('autolevel:showProbeVisualization', (_message, data) => actions.showProbe(data)),
      pubsub.subscribe('autolevel:hideProbeVisualization', () => actions.hideProbe()),
      pubsub.subscribe('autolevel:updateProbeVisualization', (_message, data) => actions.updateProbe(data)),
    ];

    config.on('change', onConfigChange);
    window.addEventListener('resize', resize);

    return () => {
      config.removeListener('change', onConfigChange);
      subscriptions.forEach(token => pubsub.unsubscribe(token));
      window.removeEventListener('resize', resize);
      resize.cancel();
    };
  }, [actions]);

  return { containerRef, isReady, actions };
}

export default useVisualizer;
