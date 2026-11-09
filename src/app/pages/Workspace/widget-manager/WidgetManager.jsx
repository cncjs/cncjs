import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from '@tonic-ui/react';
import _difference from 'lodash/difference';
import _includes from 'lodash/includes';
import _union from 'lodash/union';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  GRBL,
  MARLIN,
  SMOOTHIE,
  TINYG,
} from '@app/constants/controller';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import config from '@app/store/config';
import WidgetList from './WidgetList';

const getWidgetDefinitions = () => [
  {
    id: 'visualizer',
    caption: i18n._('Visualizer Widget'),
    details: i18n._('This widget visualizes a G-code file and simulates the tool path.'),
    disabled: true,
  },
  {
    id: 'connection',
    caption: i18n._('Connection Widget'),
    details: i18n._('This widget lets you establish a connection to a serial port.'),
    disabled: true,
  },
  {
    id: 'console',
    caption: i18n._('Console Widget'),
    details: i18n._('This widget lets you read and write data to the CNC controller connected to a serial port.'),
    disabled: false,
  },
  {
    id: 'grbl',
    caption: i18n._('Grbl Widget'),
    details: i18n._('This widget shows the Grbl state and provides Grbl specific features.'),
    disabled: false,
  },
  {
    id: 'marlin',
    caption: i18n._('Marlin Widget'),
    details: i18n._('This widget shows the Marlin state and provides Marlin specific features.'),
    disabled: false,
  },
  {
    id: 'smoothie',
    caption: i18n._('Smoothie Widget'),
    details: i18n._('This widget shows the Smoothie state and provides Smoothie specific features.'),
    disabled: false,
  },
  {
    id: 'tinyg',
    caption: i18n._('TinyG Widget'),
    details: i18n._('This widget shows the TinyG state and provides TinyG specific features.'),
    disabled: false,
  },
  {
    id: 'axes',
    caption: i18n._('Axes Widget'),
    details: i18n._('This widget shows the XYZ position. It includes jog controls, homing, and axis zeroing.'),
    disabled: false,
  },
  {
    id: 'gcode',
    caption: i18n._('G-code Widget'),
    details: i18n._('This widget shows the current status of G-code commands.'),
    disabled: false,
  },
  {
    id: 'laser',
    caption: i18n._('Laser Widget'),
    details: i18n._('This widget allows you control laser intensity and turn the laser on/off.'),
    disabled: false,
  },
  {
    id: 'macro',
    caption: i18n._('Macro Widget'),
    details: i18n._('This widget can use macros to automate routine tasks.'),
    disabled: false,
  },
  {
    id: 'autolevel',
    caption: i18n._('Autolevel Widget'),
    details: i18n._('Probe the work surface to generate Z-axis height compensation data for your G-code.'),
    disabled: false,
  },
  {
    id: 'probe',
    caption: i18n._('Probe Widget'),
    details: i18n._('This widget helps you use a touch plate to set your Z zero offset.'),
    disabled: false,
  },
  {
    id: 'tool',
    caption: i18n._('Tool Widget'),
    details: i18n._('This widget manages workflows for tool changes.'),
    disabled: false,
  },
  {
    id: 'spindle',
    caption: i18n._('Spindle Widget'),
    details: i18n._('This widget provides the spindle control.'),
    disabled: false,
  },
  {
    id: 'custom',
    caption: i18n._('Custom Widget'),
    details: i18n._('This widget gives you a communication interface for creating your own widget.'),
    disabled: false,
  },
  {
    id: 'webcam',
    caption: i18n._('Webcam Widget'),
    details: i18n._('This widget lets you monitor a webcam.'),
    disabled: false,
  },
];

const isWidgetAvailable = (id) => {
  if (id === 'grbl') {
    return _includes(controller.availableControllers, GRBL);
  }
  if (id === 'marlin') {
    return _includes(controller.availableControllers, MARLIN);
  }
  if (id === 'smoothie') {
    return _includes(controller.availableControllers, SMOOTHIE);
  }
  if (id === 'tinyg') {
    return _includes(controller.availableControllers, TINYG);
  }
  return true;
};

const getConfiguredActiveWidgets = () => {
  const defaultWidgets = config.get('workspace.container.default.widgets', [])
    .map(widgetId => widgetId.split(':')[0]);
  const primaryWidgets = config.get('workspace.container.primary.widgets', [])
    .map(widgetId => widgetId.split(':')[0]);
  const secondaryWidgets = config.get('workspace.container.secondary.widgets', [])
    .map(widgetId => widgetId.split(':')[0]);

  return _union(defaultWidgets, primaryWidgets, secondaryWidgets);
};

/**
 * @param {{ onClose?: () => void, onSave?: (value: { activeWidgets: string[], inactiveWidgets: string[] }) => void }} props
 * @returns {JSX.Element}
 */
function WidgetManager({ onClose = () => {}, onSave = () => {} }) {
  const widgetList = useMemo(
    () => getWidgetDefinitions().filter(widget => isWidgetAvailable(widget.id)),
    []
  );
  const [activeWidgetIds, setActiveWidgetIds] = useState(() => {
    const configuredWidgets = getConfiguredActiveWidgets();
    return widgetList
      .filter(widget => _includes(configuredWidgets, widget.id))
      .map(widget => widget.id);
  });
  const hasClosedRef = useRef(false);

  const handleClose = useCallback(() => {
    if (hasClosedRef.current) {
      return;
    }
    hasClosedRef.current = true;
    onClose();
  }, [onClose]);

  const handleChangeWidgetVisibility = useCallback(({ id, checked }) => {
    setActiveWidgetIds(current => (
      checked ? _union(current, [id]) : _difference(current, [id])
    ));
  }, []);

  const handleSave = useCallback(() => {
    if (hasClosedRef.current) {
      return;
    }

    const allWidgets = widgetList.map(widget => widget.id);
    const activeWidgets = widgetList
      .filter(widget => _includes(activeWidgetIds, widget.id))
      .map(widget => widget.id);
    const inactiveWidgets = _difference(allWidgets, activeWidgets);

    hasClosedRef.current = true;
    onSave({ activeWidgets, inactiveWidgets });
    onClose();
  }, [activeWidgetIds, onClose, onSave, widgetList]);

  const visibleWidgets = widgetList.map(widget => ({
    ...widget,
    visible: _includes(activeWidgetIds, widget.id),
  }));

  return (
    <Modal
      autoFocus
      closeOnEsc
      closeOnInteractOutside
      ensureFocus
      isClosable
      isOpen
      onClose={handleClose}
      size="lg"
    >
      <ModalOverlay />
      <ModalContent sx={{ maxWidth: '80%' }}>
        <ModalHeader>{i18n._('Widgets')}</ModalHeader>
        <ModalBody
          sx={{
            maxHeight: Math.max(window.innerHeight / 2, 200),
            overflowY: 'scroll',
          }}
        >
          <WidgetList
            data={visibleWidgets}
            onChange={handleChangeWidgetVisibility}
          />
        </ModalBody>
        <ModalFooter>
          <Button onClick={handleClose}>
            {i18n._('Cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
          >
            {i18n._('OK')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default WidgetManager;
