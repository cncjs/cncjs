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
        title: React.PropTypes.string,
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
            statusText: {
                fontSize: 60,
                color: checked ? '#333' : '#c9302c',
                opacity: 0.8
            }
        };

        return (
            <Widget>
                <WidgetHeader
                    style={{cursor: 'auto'}}
                    title={this.props.title}
                />
                <WidgetContent>
                    <div className="text-center" style={styles.statusText}>
                        <i className={classes.statusIcon}></i>
                    </div>
                </WidgetContent>
                <WidgetFooter className="text-right" style={{padding: 4}}>
                    <Switch
                        disabled={this.props.disabled}
                        defaultChecked={checked}
                        onChange={::this.handleChange}
                        checkedChildren={i18n._('ON')}
                        unCheckedChildren={i18n._('OFF')}
                    />
                </WidgetFooter>
            </Widget>
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
                            title={o.caption}
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

class AddWidgets extends React.Component {
    static propTypes = {
        onSave: React.PropTypes.func,
        onClose: React.PropTypes.func.isRequired
    };
    state = {
        show: true
    };
    widgetList = [
        {
            id: 'connection',
            caption: i18n._('Connection'),
            visible: true,
            disabled: true
        },
        {
            id: 'grbl',
            caption: i18n._('Grbl'),
            visible: true,
            disabled: false
        },
        {
            id: 'console',
            caption: i18n._('Console'),
            visible: true,
            disabled: false
        },
        {
            id: 'axes',
            caption: i18n._('Axes'),
            visible: true,
            disabled: false
        },
        {
            id: 'gcode',
            caption: i18n._('G-code'),
            visible: true,
            disabled: false
        },
        {
            id: 'probe',
            caption: i18n._('Probe'),
            visible: true,
            disabled: false
        },
        {
            id: 'spindle',
            caption: i18n._('Spindle'),
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

        let list = _(this.widgetList)
            .filter((item) => {
                return item.visible;
            })
            .map((item) => {
                return item.id;
            })
            .value();

        this.props.onSave(list);
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
            store.get('workspace.container.primary'),
            store.get('workspace.container.secondary')
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
                dialogClassName="modal-vertical-center"
                show={this.state.show}
                onHide={::this.handleCancel}
            >
                <Modal.Header closeButton>
                    <Modal.Title>{i18n._('Add Widgets')}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="nopadding">
                    <WidgetList list={this.widgetList} onChange={::this.handleChange} />
                </Modal.Body>
                <Modal.Footer>
                    <Button bsStyle="primary" onClick={::this.handleSave}>{i18n._('Save')}</Button>
                    <Button onClick={::this.handleCancel}>{i18n._('Cancel')}</Button>
                </Modal.Footer>
            </Modal>
        );
    }
}

// @param {string} targetContainer The target container: primary|secondary
export const show = (callback) => {
    const el = document.body.appendChild(document.createElement('div'));  
    const handleClose = (e) => {
        ReactDOM.unmountComponentAtNode(el);
        setTimeout(() => {
            el.remove();
        }, 0);
    };

    ReactDOM.render(<AddWidgets onSave={callback} onClose={handleClose} />, el);
};

export default AddWidgets;
