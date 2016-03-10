import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import { Button, Modal } from 'react-bootstrap';
import i18n from '../../lib/i18n';
import store from '../../store';
import WidgetList from './WidgetList';

class WidgetManager extends React.Component {
    static propTypes = {
        onSave: React.PropTypes.func,
        onClose: React.PropTypes.func.isRequired
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
            id: 'grbl',
            caption: i18n._('Grbl Widget'),
            details: i18n._('This widet shows the Grbl state and provides Grbl specific features.'),
            visible: true,
            disabled: false
        },
        {
            id: 'console',
            caption: i18n._('Console Widget'),
            details: i18n._('This widget lets you read and write data to the CNC controller connected to a serial port.'),
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
            details: i18n._('This widgets shows the current status of G-code commands.'),
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
            id: 'webcam',
            caption: i18n._('Webcam Widget'),
            details: i18n._('This widget lets you monitor a webcam.'),
            visible: true,
            disabled: false
        }
    ];

    componentDidUpdate() {
        if (!(this.state.show)) {
            this.props.onClose();
        }
    }
    handleSave() {
        this.setState({ show: false });

        let activeWidgets = _(this.widgetList)
            .filter((item) => {
                return item.visible;
            })
            .map((item) => {
                return item.id;
            })
            .value();
        let inactiveWidgets = _(this.widgetList)
            .map('id')
            .difference(activeWidgets)
            .value();

        this.props.onSave(activeWidgets, inactiveWidgets);
    }
    handleCancel() {
        this.setState({ show: false });
    }
    handleChange(id, checked) {
        let o = _.find(this.widgetList, { id: id });
        if (o) {
            o.visible = checked;
        }
    }
    render() {
        const widgets = _.concat(
            store.get('workspace.container.default.widgets'),
            store.get('workspace.container.primary.widgets'),
            store.get('workspace.container.secondary.widgets')
        );
        _.each(this.widgetList, (widget) => {
            if (_.includes(widgets, widget.id)) {
                widget.visible = true;
            } else {
                widget.visible = false;
            }
        });

        return (
            <Modal
                backdrop="static"
                bsSize="large"
                dialogClassName="modal-vertical-center"
                onHide={::this.handleCancel}
                show={this.state.show}
            >
                <Modal.Header closeButton>
                    <Modal.Title>{i18n._('Widgets')}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="nopadding">
                    <WidgetList list={this.widgetList} onChange={::this.handleChange} />
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={::this.handleSave}>{i18n._('Save')}</Button>
                    <Button onClick={::this.handleCancel}>{i18n._('Cancel')}</Button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export default WidgetManager;
