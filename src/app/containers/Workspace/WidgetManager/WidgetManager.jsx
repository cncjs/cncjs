import difference from 'lodash/difference';
import find from 'lodash/find';
import includes from 'lodash/includes';
import union from 'lodash/union';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Modal from 'app/components/Modal';
import { GRBL, MARLIN, SMOOTHIE, TINYG } from 'app/constants';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import store from 'app/store';
import WidgetList from './WidgetList';

class WidgetManager extends PureComponent {
    static propTypes = {
      onSave: PropTypes.func,
      onClose: PropTypes.func.isRequired
    };

    state = {
      show: true
    };

    widgetList = [
      {
        id: 'visualizer',
        caption: i18n._('Visualizer Widget'),
        details: i18n._('This widget visualizes a G-code file and simulates the tool path.'),
        visible: true,
        disabled: true
      },
      {
        id: 'connection',
        caption: i18n._('Connection Widget'),
        details: i18n._('This widget lets you establish a connection to a serial port.'),
        visible: true,
        disabled: true
      },
      {
        id: 'console',
        caption: i18n._('Console Widget'),
        details: i18n._('This widget lets you read and write data to the CNC controller connected to a serial port.'),
        visible: true,
        disabled: false
      },
      {
        id: 'grbl',
        caption: i18n._('Grbl Widget'),
        details: i18n._('This widget shows the Grbl state and provides Grbl specific features.'),
        visible: true,
        disabled: false
      },
      {
        id: 'marlin',
        caption: i18n._('Marlin Widget'),
        details: i18n._('This widget shows the Marlin state and provides Marlin specific features.'),
        visible: true,
        disabled: false
      },
      {
        id: 'smoothie',
        caption: i18n._('Smoothie Widget'),
        details: i18n._('This widget shows the Smoothie state and provides Smoothie specific features.'),
        visible: true,
        disabled: false
      },
      {
        id: 'tinyg',
        caption: i18n._('TinyG Widget'),
        details: i18n._('This widget shows the TinyG state and provides TinyG specific features.'),
        visible: true,
        disabled: false
      },
      {
        id: 'axes',
        caption: i18n._('Axes Widget'),
        details: i18n._('This widget shows the XYZ position. It includes jog controls, homing, and axis zeroing.'),
        visible: true,
        disabled: false
      },
      {
        id: 'gcode',
        caption: i18n._('G-code Widget'),
        details: i18n._('This widget shows the current status of G-code commands.'),
        visible: true,
        disabled: false
      },
      {
        id: 'laser',
        caption: i18n._('Laser Widget'),
        details: i18n._('This widget allows you control laser intensity and turn the laser on/off.'),
        visible: true,
        disabled: false
      },
      {
        id: 'macro',
        caption: i18n._('Macro Widget'),
        details: i18n._('This widget can use macros to automate routine tasks.'),
        visible: true,
        disabled: false
      },
      {
        id: 'probe',
        caption: i18n._('Probe Widget'),
        details: i18n._('This widget helps you use a touch plate to set your Z zero offset.'),
        visible: true,
        disabled: false
      },
      {
        id: 'spindle',
        caption: i18n._('Spindle Widget'),
        details: i18n._('This widget provides the spindle control.'),
        visible: true,
        disabled: false
      },
      {
        id: 'custom',
        caption: i18n._('Custom Widget'),
        details: i18n._('This widget gives you a communication interface for creating your own widget.'),
        visible: true,
        disabled: false
      },
      {
        id: 'webcam',
        caption: i18n._('Webcam Widget'),
        details: i18n._('This widget lets you monitor a webcam.'),
        visible: true,
        disabled: false
      },
      {
        id: 'autolevel',
        caption: i18n._('AutoLevel Widget'),
        details: i18n._('This widget lets you probe a grid for autolevelling a PCB.'),
        visible: true,
        disabled: false
      }
    ];

    handleSave = () => {
      this.setState({ show: false });

      const allWidgets = this.widgetList.map(item => item.id);
      const activeWidgets = this.widgetList
        .filter(item => item.visible)
        .map(item => item.id);
      const inactiveWidgets = difference(allWidgets, activeWidgets);

      this.props.onSave(activeWidgets, inactiveWidgets);
    };

    handleCancel = () => {
      this.setState({ show: false });
    };

    constructor(props) {
      super(props);

      this.widgetList = this.widgetList.filter(widgetItem => {
        if (widgetItem.id === 'grbl' && !includes(controller.loadedControllers, GRBL)) {
          return false;
        }
        if (widgetItem.id === 'marlin' && !includes(controller.loadedControllers, MARLIN)) {
          return false;
        }
        if (widgetItem.id === 'smoothie' && !includes(controller.loadedControllers, SMOOTHIE)) {
          return false;
        }
        if (widgetItem.id === 'tinyg' && !includes(controller.loadedControllers, TINYG)) {
          return false;
        }
        return true;
      });
    }

    componentDidUpdate() {
      if (!(this.state.show)) {
        this.props.onClose();
      }
    }

    render() {
      const defaultWidgets = store.get('workspace.container.default.widgets', [])
        .map(widgetId => widgetId.split(':')[0]);
      const primaryWidgets = store.get('workspace.container.primary.widgets', [])
        .map(widgetId => widgetId.split(':')[0]);
      const secondaryWidgets = store.get('workspace.container.secondary.widgets', [])
        .map(widgetId => widgetId.split(':')[0]);
      const activeWidgets = union(defaultWidgets, primaryWidgets, secondaryWidgets);

      this.widgetList.forEach(widget => {
        if (includes(activeWidgets, widget.id)) {
          widget.visible = true;
        } else {
          widget.visible = false;
        }
      });

      return (
        <Modal
          size="md"
          onClose={this.handleCancel}
          show={this.state.show}
        >
          <Modal.Header>
            <Modal.Title>{i18n._('Widgets')}</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ padding: 0 }}>
            <WidgetList
              list={this.widgetList}
              onChange={(id, checked) => {
                const o = find(this.widgetList, { id: id });
                if (o) {
                  o.visible = checked;
                }
              }}
            />
          </Modal.Body>
          <Modal.Footer>
            <button
              type="button"
              className="btn btn-default"
              onClick={this.handleCancel}
            >
              {i18n._('Cancel')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={this.handleSave}
            >
              {i18n._('OK')}
            </button>
          </Modal.Footer>
        </Modal>
      );
    }
}

export default WidgetManager;
