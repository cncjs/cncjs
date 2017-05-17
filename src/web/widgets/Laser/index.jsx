import includes from 'lodash/includes';
import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import Widget from '../../components/Widget';
import confirm from '../../lib/confirm';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import store from '../../store';
import Laser from './Laser';
import {
    // Grbl
    GRBL,
    // Smoothie
    SMOOTHIE,
    // TinyG
    TINYG
} from '../../constants';
import styles from './index.styl';

class LaserWidget extends Component {
    static propTypes = {
        widgetId: PropTypes.string.isRequired,
        onDelete: PropTypes.func,
        sortable: PropTypes.object
    };
    static defaultProps = {
        onDelete: () => {}
    };

    state = this.getInitialState();
    actions = {
        toggleFullscreen: () => {
            const { isFullscreen } = this.state;
            this.setState({ isFullscreen: !isFullscreen });
        },
        toggleMinimized: () => {
            const { minimized } = this.state;
            this.setState({ minimized: !minimized });
        },
        deleteWidget: () => {
            confirm({
                title: i18n._('Delete Widget'),
                body: i18n._('Are you sure you want to delete this widget?')
            }).then(() => {
                this.props.onDelete();
            });
        },
        toggleLaserTest: () => {
            const expanded = this.state.panel.laserTest.expanded;

            this.setState({
                panel: {
                    ...this.state.panel,
                    laserTest: {
                        ...this.state.panel.laserTest,
                        expanded: !expanded
                    }
                }
            });
        },
        changeLaserTestPower: (value) => {
            const power = Number(value) || 0;
            this.setState({
                test: {
                    ...this.state.test,
                    power
                }
            });
        },
        changeLaserTestDuration: (event) => {
            const duration = Number(event.target.value) || 0;
            this.setState({
                test: {
                    ...this.state.test,
                    duration
                }
            });
        },
        laserTestOn: () => {
            const { power, duration } = this.state.test;
            controller.command('lasertest:on', power, duration);
        },
        laserTestOff: () => {
            controller.command('lasertest:off');
        }
    };
    controllerEvents = {
        'serialport:open': (options) => {
            const { port } = options;
            this.setState({ port: port });
        },
        'serialport:close': (options) => {
            const initialState = this.getInitialState();
            this.setState({ ...initialState });
        },
        'Grbl:state': (state) => {
            this.setState({
                controller: {
                    type: GRBL,
                    state: state
                }
            });
        },
        'Smoothie:state': (state) => {
            this.setState({
                controller: {
                    type: SMOOTHIE,
                    state: state
                }
            });
        },
        'TinyG:state': (state) => {
            this.setState({
                controller: {
                    type: TINYG,
                    state: state
                }
            });
        }
    };

    componentDidMount() {
        this.addControllerEvents();
    }
    componentWillUnmount() {
        this.removeControllerEvents();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    componentDidUpdate(prevProps, prevState) {
        const {
            minimized,
            panel,
            test
        } = this.state;

        store.set('widgets.laser.minimized', minimized);
        store.set('widgets.laser.panel.laserTest.expanded', panel.laserTest.expanded);
        store.set('widgets.laser.test.power', test.power);
        store.set('widgets.laser.test.duration', test.duration);
    }
    getInitialState() {
        return {
            minimized: store.get('widgets.laser.minimized', false),
            isFullscreen: false,
            canClick: true, // Defaults to true
            port: controller.port,
            controller: {
                type: controller.type,
                state: controller.state
            },
            panel: {
                laserTest: {
                    expanded: store.get('widgets.laser.panel.laserTest.expanded')
                }
            },
            test: {
                power: store.get('widgets.laser.test.power', 0),
                duration: store.get('widgets.laser.test.duration', 0)
            }
        };
    }
    addControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.on(eventName, callback);
        });
    }
    removeControllerEvents() {
        Object.keys(this.controllerEvents).forEach(eventName => {
            const callback = this.controllerEvents[eventName];
            controller.off(eventName, callback);
        });
    }
    canClick() {
        const { port } = this.state;
        const controllerType = this.state.controller.type;

        if (!port) {
            return false;
        }
        if (!includes([GRBL, SMOOTHIE, TINYG], controllerType)) {
            return false;
        }

        return true;
    }
    render() {
        const { minimized, isFullscreen } = this.state;
        const state = {
            ...this.state,
            canClick: this.canClick()
        };
        const actions = {
            ...this.actions
        };

        return (
            <Widget fullscreen={isFullscreen}>
                <Widget.Header>
                    <Widget.Title>
                        <Widget.Sortable className={this.props.sortable.handleClassName}>
                            <i className="fa fa-bars" />
                            <span className="space" />
                        </Widget.Sortable>
                        {i18n._('Laser')}
                    </Widget.Title>
                    <Widget.Controls className={this.props.sortable.filterClassName}>
                        <Widget.Button
                            title={minimized ? i18n._('Open') : i18n._('Close')}
                            onClick={actions.toggleMinimized}
                        >
                            <i
                                className={classNames(
                                    'fa',
                                    { 'fa-chevron-up': !minimized },
                                    { 'fa-chevron-down': minimized }
                                )}
                            />
                        </Widget.Button>
                        <Widget.Button
                            title={i18n._('Fullscreen')}
                            onClick={actions.toggleFullscreen}
                        >
                            <i
                                className={classNames(
                                    'fa',
                                    { 'fa-expand': !isFullscreen },
                                    { 'fa-compress': isFullscreen }
                                )}
                            />
                        </Widget.Button>
                        <Widget.Button
                            title={i18n._('Remove')}
                            onClick={actions.deleteWidget}
                        >
                            <i className="fa fa-times" />
                        </Widget.Button>
                    </Widget.Controls>
                </Widget.Header>
                <Widget.Content
                    className={classNames(
                        styles['widget-content'],
                        { [styles.hidden]: minimized }
                    )}
                >
                    <Laser
                        state={state}
                        actions={actions}
                    />
                </Widget.Content>
            </Widget>
        );
    }
}

export default LaserWidget;
