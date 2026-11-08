import PropTypes from 'prop-types';
import React from 'react';
import { WIDGET_REGISTRY } from './widgetRegistry';
import { useWorkspaceLayout } from './useWorkspaceLayout';

const WidgetWithLayout = ({ Component, widgetId, ...props }) => {
  const {
    getWidgetView,
    setWidgetView,
  } = useWorkspaceLayout();
  const view = getWidgetView(widgetId);

  return (
    <Component
      {...props}
      widgetId={widgetId}
      view={view}
      onViewChange={nextView => setWidgetView(widgetId, nextView)}
    />
  );
};

WidgetWithLayout.propTypes = {
  Component: PropTypes.elementType.isRequired,
  widgetId: PropTypes.string.isRequired,
};

const WidgetHost = ({ widgetId, ...props }) => {
  if (typeof widgetId !== 'string') {
    return null;
  }

  const name = widgetId.split(':')[0];
  const entry = WIDGET_REGISTRY[name];

  if (!entry) {
    return null;
  }

  if (!entry.hasFrame) {
    return <entry.Component {...props} widgetId={widgetId} />;
  }

  return (
    <WidgetWithLayout
      {...props}
      Component={entry.Component}
      widgetId={widgetId}
    />
  );
};

WidgetHost.propTypes = {
  widgetId: PropTypes.string.isRequired,
};

export default WidgetHost;
