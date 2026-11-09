const EMPTY_OBJECT = {};

export const selectVisibleWidgetIds = (ids, availableControllers, registry) => {
  return ids.filter(id => {
    const entry = registry[id.split(':')[0]];
    return entry && (!entry.controllerType || availableControllers.includes(entry.controllerType));
  });
};

export const setWidgetsCollapsed = (widgets, ids, collapsed) => {
  let next = widgets;
  ids.forEach(id => {
    const previous = widgets[id] || {};
    if (Boolean(previous.minimized) === collapsed) {
      return;
    }
    if (next === widgets) {
      next = { ...widgets };
    }
    next[id] = { ...previous, minimized: collapsed };
  });
  return next;
};

export const createCollapsedSnapshotReader = (config) => {
  let previousIds = [];
  let previousSnapshot = EMPTY_OBJECT;

  return () => {
    const widgets = config.get('widgets', EMPTY_OBJECT) || EMPTY_OBJECT;
    const collapsedIds = Object.keys(widgets)
      .filter(id => Boolean(widgets[id]?.minimized))
      .sort();

    if (
      collapsedIds.length === previousIds.length &&
      collapsedIds.every((id, index) => id === previousIds[index])
    ) {
      return previousSnapshot;
    }

    previousIds = collapsedIds;
    previousSnapshot = collapsedIds.reduce((snapshot, id) => {
      snapshot[id] = true;
      return snapshot;
    }, {});
    return previousSnapshot;
  };
};
