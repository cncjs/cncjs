export const translatePathByWidgetId = (widgetId) => (path) => {
  if (!widgetId) {
    throw new TypeError(`"widgetId" is not defined: ${widgetId}`);
  }

  if (typeof path === 'string') {
    return ['widgets', widgetId, ...path.split('.')];
  }

  if (Array.isArray(path)) {
    return ['widgets', widgetId, ...path];
  }

  return ['widgets', widgetId];
};
