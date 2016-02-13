import _ from 'lodash';
import classNames from 'classnames';
import React from 'react';
import ReactDOM from 'react-dom';
import Switch from 'rc-switch';
import { Grid, Row, Col, Thumbnail, Button, ButtonGroup, Modal } from 'react-bootstrap';
import { Widget, WidgetHeader, WidgetContent, WidgetFooter } from '../widget';
import i18n from '../../lib/i18n';
import store from '../../store';

class WidgetListItem extends React.Component {
    static propTypes = {
        id: React.PropTypes.string,
        caption: React.PropTypes.string,
        details: React.PropTypes.string,
        checked: React.PropTypes.bool,
        disabled: React.PropTypes.bool,
        onChange: React.PropTypes.func
    };
    state = {
        checked: this.props.checked
    };

    handleChange(checked) {
        this.setState({ checked: checked });
        this.props.onChange(this.props.id, checked);
    }
    render() {
        const { checked } = this.state;
        const classes = {
            statusIcon: classNames(
                'fa',
                { 'fa-ban': !checked },
                { 'fa-check-circle-o': checked }
            )
        };
        const styles = {
            thumbnail: {
                fontSize: 100,
                backgroundColor: checked ? '#4e69a2' : '#f5f6f7',
                color: checked ? '#fff' : '#ccc'
            },
            caption: {
                color: '#333',
                fontWeight: 'bold',
                opacity: checked ? 1 : 0.6
            },
            details: {
                color: '#333',
                height: 60,
                marginTop: 15,
                maxHeight: 60,
                opacity: checked ? 1 : 0.6
            }
        };

        return (
            <div className="panel panel-default">
                <div className="panel-head text-center" style={styles.thumbnail}>
                    <i className="fa fa-list-alt"></i>
                </div>
                <div className="panel-body">
                    <div className="container-fluid">
                        <div className="row no-gutter">
                            <div className="col-sm-8 text-left">
                                <span style={styles.caption}>{this.props.caption}</span>
                            </div>
                            <div className="col-sm-4 text-right">
                                <Switch
                                    className="noselect"
                                    disabled={this.props.disabled}
                                    defaultChecked={checked}
                                    onChange={::this.handleChange}
                                    checkedChildren={i18n._('ON')}
                                    unCheckedChildren={i18n._('OFF')}
                                />
                            </div>
                        </div>
                    </div>
                    <div style={styles.details}>
                        <p>{this.props.details}</p>
                    </div>
                </div>
            </div>
        );
    }
}

class WidgetList extends React.Component {
    static propTypes = {
        list: React.PropTypes.array.isRequired,
        onChange: React.PropTypes.func
    };

    render() {
        const style = {
            maxHeight: Math.max(window.innerHeight / 2, 200),
            minWidth: 400,
            overflowY: 'scroll',
            padding: 15
        };

        return (
            <Grid fluid={true} style={style}>
                <Row>
                {_.map(this.props.list, (o, key) =>
                    <Col xs={6} md={4} key={key}>
                        <WidgetListItem
                            id={o.id}
                            caption={o.caption}
                            details={o.details}
                            checked={o.visible}
                            disabled={o.disabled}
                            onChange={this.props.onChange}
                        />
                    </Col>
                )}
                </Row>
            </Grid>
        );
    }
}

class Widgets extends React.Component {
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

export const getActiveWidgets = () => {
    const defaultWidgets = store.get('workspace.container.default.widgets');
    const primaryWidgets = store.get('workspace.container.primary.widgets');
    const secondaryWidgets = store.get('workspace.container.secondary.widgets');
    const activeWidgets = _.concat(defaultWidgets, primaryWidgets, secondaryWidgets);

    return activeWidgets;
};

export const getInactiveWidgets = () => {
    const allWidgets = _.keys(store.get('widgets'));
    const defaultWidgets = store.get('workspace.container.default.widgets');
    const primaryWidgets = store.get('workspace.container.primary.widgets');
    const secondaryWidgets = store.get('workspace.container.secondary.widgets');
    const inactiveWidgets = _.difference(allWidgets, defaultWidgets, primaryWidgets, secondaryWidgets);

    return inactiveWidgets;
};

// @param {string} targetContainer The target container: primary|secondary
export const show = (callback) => {
    const el = document.body.appendChild(document.createElement('div'));  
    const handleClose = (e) => {
        ReactDOM.unmountComponentAtNode(el);
        setTimeout(() => {
            el.remove();
        }, 0);
    };

    ReactDOM.render(<Widgets onSave={callback} onClose={handleClose} />, el);
};

export default Widgets;
