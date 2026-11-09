import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import controller from '@app/lib/controller';
import Widget from './Widget';
import { useWidgetGroup } from './useWidgetGroup';
import { WIDGET_REGISTRY } from './widgetRegistry';
import { selectVisibleWidgetIds } from './widgetLayoutState';
import styles from './widgets.styl';

const DefaultWidgets = ({ className }) => {
  const { ids } = useWidgetGroup('default');
  const widgets = selectVisibleWidgetIds(
    ids,
    controller.availableControllers,
    WIDGET_REGISTRY
  ).map(widgetId => (
    <div data-widget-id={widgetId} key={widgetId}>
      <Widget widgetId={widgetId} />
    </div>
  ));

  return (
    <div className={classNames(className, styles.widgets)}>
      {widgets}
    </div>
  );
};

DefaultWidgets.propTypes = {
  className: PropTypes.string,
};

export default DefaultWidgets;
