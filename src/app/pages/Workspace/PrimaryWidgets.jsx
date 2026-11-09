import classNames from 'classnames';
import { ensureArray } from 'ensure-type';
import pubsub from 'pubsub-js';
import React, { useEffect } from 'react';
import Sortable from 'react-sortablejs';
import { v4 as uuidv4 } from 'uuid';
import {
  Box,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from '@tonic-ui/react';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import log from '@app/lib/log';
import portal from '@app/lib/portal';
import config from '@app/store/config';
import Widget from './Widget';
import { useWidgetGroup } from './useWidgetGroup';
import { WIDGET_REGISTRY } from './widgetRegistry';
import { selectVisibleWidgetIds } from './widgetLayoutState';
import styles from './widgets.styl';

const noop = () => {};

/**
 * @param {{
 *   className?: string,
 *   onForkWidget?: (widgetId: string) => void,
 *   onRemoveWidget?: (widgetId: string) => void,
 *   onDragStart?: () => void,
 *   onDragEnd?: () => void,
 * }} props Component props.
 */
const PrimaryWidgets = ({
  className = '',
  onForkWidget = noop,
  onRemoveWidget = noop,
  onDragStart = noop,
  onDragEnd = noop,
}) => {
  const { ids, setWidgetIds } = useWidgetGroup('primary');

  useEffect(() => {
    const token = pubsub.subscribe('updatePrimaryWidgets', (msg, widgets) => {
      setWidgetIds(ensureArray(widgets));
    });

    return () => {
      pubsub.unsubscribe(token);
    };
  }, [setWidgetIds]);

  const forkWidget = widgetId => () => {
    portal(({ onClose }) => (
      <Modal
        autoFocus
        closeOnEsc={false}
        closeOnInteractOutside
        ensureFocus
        isClosable
        isOpen
        onClose={onClose}
        size="xs"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{i18n._('Fork Widget')}</ModalHeader>
          <ModalBody>
            {i18n._('Are you sure you want to fork this widget?')}
          </ModalBody>
          <ModalFooter>
            <Button
              onClick={onClose}
            >
              {i18n._('Cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const name = widgetId.split(':')[0];
                if (!name) {
                  log.error(`Failed to fork widget: widgetId=${widgetId}`);
                  onClose();
                  return;
                }

                // Use the same widget settings in a new widget
                const forkedWidgetId = `${name}:${uuidv4()}`;
                const defaultSettings = config.get(['widgets', name]);
                const clonedSettings = config.get(['widgets', widgetId], defaultSettings);
                config.set(['widgets', forkedWidgetId], clonedSettings);

                setWidgetIds([...ids, forkedWidgetId]);
                onForkWidget(widgetId);
                onClose();
              }}
            >
              {i18n._('OK')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    ));
  };

  const removeWidget = widgetId => () => {
    portal(({ onClose }) => (
      <Modal
        autoFocus
        closeOnEsc={false}
        closeOnInteractOutside
        ensureFocus
        isClosable
        isOpen
        onClose={onClose}
        size="xs"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{i18n._('Remove Widget')}</ModalHeader>
          <ModalBody>
            {i18n._('Are you sure you want to remove this widget?')}
          </ModalBody>
          <ModalFooter>
            <Button
              onClick={onClose}
            >
              {i18n._('Cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setWidgetIds(ids.filter(id => id !== widgetId));

                if (widgetId.match(/\w+:[\w\-]+/)) {
                // Remove forked widget settings
                  config.unset(['widgets', widgetId]);
                }

                onRemoveWidget(widgetId);
                onClose();
              }}
            >
              {i18n._('OK')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    ));
  };

  const widgets = selectVisibleWidgetIds(
    ids,
    controller.availableControllers,
    WIDGET_REGISTRY
  ).map(widgetId => (
    <Box data-widget-id={widgetId} key={widgetId}>
      <Widget
        widgetId={widgetId}
        onFork={forkWidget(widgetId)}
        onRemove={removeWidget(widgetId)}
        sortable={{
          handleClassName: 'sortable-handle',
          filterClassName: 'sortable-filter'
        }}
      />
    </Box>
  ));

  return (
    <Sortable
      className={classNames(className, styles.widgets)}
      options={{
        animation: 150,
        delay: 0, // Touch and hold delay
        group: {
          name: 'primary',
          pull: true,
          put: ['secondary']
        },
        handle: '.sortable-handle', // Selectors that do not lead to dragging
        filter: '.sortable-filter', // Selectors that do not lead to dragging
        chosenClass: 'sortable-chosen', // Class name for the chosen item
        ghostClass: 'sortable-ghost', // Class name for the drop placeholder
        dataIdAttr: 'data-widget-id',
        onStart: onDragStart,
        onEnd: onDragEnd
      }}
      onChange={order => {
        setWidgetIds(ensureArray(order));
      }}
    >
      {widgets}
    </Sortable>
  );
};

export default PrimaryWidgets;
