import PropTypes from 'prop-types';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import configSingleton from '@app/store/config';
import { WIDGET_REGISTRY } from './widgetRegistry';
import {
  createCollapsedSnapshotReader,
  setWidgetsCollapsed as updateWidgetsCollapsed,
} from './widgetLayoutState';

const EMPTY_ARRAY = [];
const WorkspaceLayoutContext = createContext(null);
const WIDGET_GROUPS = ['default', 'primary', 'secondary'];
const WIDGET_VIEWS = ['normal', 'collapsed', 'fullscreen'];

const createWidgetIdsReader = (config, group) => {
  let previousIds = EMPTY_ARRAY;

  return () => {
    const ids = config.get(
      ['workspace', 'container', group, 'widgets'],
      EMPTY_ARRAY
    ) || EMPTY_ARRAY;

    if (
      Array.isArray(ids) &&
      ids.length === previousIds.length &&
      ids.every((id, index) => id === previousIds[index])
    ) {
      return previousIds;
    }

    previousIds = Array.isArray(ids) ? ids.slice() : EMPTY_ARRAY;
    return previousIds;
  };
};

const subscribeToConfig = (config, listener) => {
  config.on('change', listener);
  return () => config.off('change', listener);
};

const createActiveWidgetIdsReader = config => {
  let previousIds = EMPTY_ARRAY;

  return () => {
    const ids = WIDGET_GROUPS.reduce((activeIds, group) => {
      const groupIds = config.get(
        ['workspace', 'container', group, 'widgets'],
        EMPTY_ARRAY
      );
      return activeIds.concat(Array.isArray(groupIds) ? groupIds : []);
    }, []);

    if (
      ids.length === previousIds.length &&
      ids.every((id, index) => id === previousIds[index])
    ) {
      return previousIds;
    }

    previousIds = ids;
    return previousIds;
  };
};

const createWidgetSnapshotReader = config => {
  const collapsedReader = createCollapsedSnapshotReader(config);
  const activeWidgetIdsReader = createActiveWidgetIdsReader(config);
  let previousSnapshot = null;

  return () => {
    const collapsed = collapsedReader();
    const activeWidgetIds = activeWidgetIdsReader();

    if (
      previousSnapshot &&
      previousSnapshot.collapsed === collapsed &&
      previousSnapshot.activeWidgetIds === activeWidgetIds
    ) {
      return previousSnapshot;
    }

    previousSnapshot = {
      collapsed,
      activeWidgetIds,
    };
    return previousSnapshot;
  };
};

export const WorkspaceLayoutProvider = ({ children, config = configSingleton }) => {
  const snapshotReader = useMemo(
    () => createWidgetSnapshotReader(config),
    [config]
  );
  const subscribe = useCallback(
    listener => subscribeToConfig(config, listener),
    [config]
  );
  const snapshot = useSyncExternalStore(subscribe, snapshotReader, snapshotReader);
  const { collapsed, activeWidgetIds } = snapshot;
  const [fullscreenById, setFullscreenById] = useState({});
  const fullscreenRef = useRef({});

  useEffect(() => {
    const activeIds = new Set(activeWidgetIds);
    const current = fullscreenRef.current;
    const next = Object.keys(current).reduce((fullscreen, id) => {
      if (activeIds.has(id)) {
        fullscreen[id] = true;
      }
      return fullscreen;
    }, {});

    if (Object.keys(next).length === Object.keys(current).length) {
      return;
    }

    fullscreenRef.current = next;
    setFullscreenById(next);
  }, [activeWidgetIds]);

  const setWidgetsCollapsed = useCallback((ids, next) => {
    const filteredIds = (ids || []).filter(id => {
      const entry = WIDGET_REGISTRY[id.split(':')[0]];
      return entry?.hasFrame && !fullscreenRef.current[id];
    });

    if (filteredIds.length === 0) {
      return;
    }

    config.update('widgets', widgets => updateWidgetsCollapsed(widgets || {}, filteredIds, next));
  }, [config]);

  const setWidgetView = useCallback((id, view) => {
    const entry = WIDGET_REGISTRY[id.split(':')[0]];
    if (!entry?.hasFrame || !WIDGET_VIEWS.includes(view)) {
      return;
    }

    const isFullscreen = Boolean(fullscreenRef.current[id]);
    if (view === 'fullscreen') {
      setWidgetsCollapsed([id], false);

      if (!isFullscreen) {
        const nextFullscreen = { ...fullscreenRef.current, [id]: true };
        fullscreenRef.current = nextFullscreen;
        setFullscreenById(nextFullscreen);
      }
      return;
    }

    if (isFullscreen) {
      const nextFullscreen = { ...fullscreenRef.current };
      delete nextFullscreen[id];
      fullscreenRef.current = nextFullscreen;
      setFullscreenById(nextFullscreen);
    }

    setWidgetsCollapsed([id], view === 'collapsed');
  }, [setWidgetsCollapsed]);

  const getWidgetView = useCallback((id) => {
    if (fullscreenById[id]) {
      return 'fullscreen';
    }
    return collapsed[id] ? 'collapsed' : 'normal';
  }, [collapsed, fullscreenById]);

  const value = useMemo(() => ({
    config,
    getWidgetView,
    setWidgetsCollapsed,
    setWidgetView,
  }), [config, getWidgetView, setWidgetView, setWidgetsCollapsed]);

  return (
    <WorkspaceLayoutContext.Provider value={value}>
      {children}
    </WorkspaceLayoutContext.Provider>
  );
};

WorkspaceLayoutProvider.propTypes = {
  children: PropTypes.node,
  config: PropTypes.object,
};

export const useWorkspaceLayout = () => {
  const context = useContext(WorkspaceLayoutContext);
  if (!context) {
    throw new Error('useWorkspaceLayout must be used within WorkspaceLayoutProvider');
  }
  return context;
};

export const useWidgetGroup = (group) => {
  const { config } = useWorkspaceLayout();
  const reader = useMemo(() => createWidgetIdsReader(config, group), [config, group]);
  const subscribe = useCallback(
    listener => subscribeToConfig(config, listener),
    [config]
  );
  const ids = useSyncExternalStore(subscribe, reader, reader);
  const setWidgetIds = useCallback((nextIds) => {
    config.set(['workspace', 'container', group, 'widgets'], nextIds);
  }, [config, group]);

  return { ids, setWidgetIds };
};
