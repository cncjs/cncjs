import classNames from 'classnames';
import ExpressionEvaluator from 'expr-eval';
import pubsub from 'pubsub-js';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import api from '../../api';
import Widget from '../../components/Widget';
import confirm from '../../lib/confirm';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import log from '../../lib/log';
import store from '../../store';
import Macro from './Macro';
import {
    MODAL_STATE_NONE,
    MODAL_STATE_ADD_MACRO,
    MODAL_STATE_EDIT_MACRO,
    MODAL_STATE_RUN_MACRO
} from './constants';
import styles from './index.styl';

const translateGCodeWithContext = (function() {
    const { Parser } = ExpressionEvaluator;
    const reExpressionContext = new RegExp(/\[[^\]]+\]/g);

    return function fnTranslateGCodeWithContext(gcode, context = controller.context) {
        if (typeof gcode !== 'string') {
            log.error(`Invalid parameter: gcode=${gcode}`);
            return '';
        }

        const lines = gcode.split('\n');

        // The work position (i.e. posx, posy, posz) are not included in the context
        context = {
            ...controller.context,
            ...context
        };

        return lines.map(line => {
            try {
                line = line.replace(reExpressionContext, (match) => {
                    const expr = match.slice(1, -1);
                    return Parser.evaluate(expr, context);
                });
            } catch (e) {
                // Bypass unknown expression
            }

            return line;
        }).join('\n');
    };
}());

class MacroWidget extends Component {
    static propTypes = {
        onDelete: PropTypes.func,
        sortable: PropTypes.object
    };
    static defaultProps = {
        onDelete: () => {}
    };

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
        openModal: (modalState = MODAL_STATE_NONE, modalParams = {}) => {
            this.setState({
                modalState: modalState,
                modalParams: modalParams
            });
        },
        closeModal: () => {
            this.setState({
                modalState: MODAL_STATE_NONE,
                modalParams: {}
            });
        },
        updateModalParams: (params = {}) => {
            this.setState({
                modalParams: {
                    ...this.state.modalParams,
                    ...params
                }
            });
        },
        fetchMacros: async () => {
            try {
                let res;
                res = await api.macros.fetch({ paging: false });
                const { records: macros } = res.body;
                this.setState({ macros: macros });
            } catch (err) {
                // Ignore error
            }
        },
        addMacro: async ({ name, content }) => {
            try {
                let res;
                res = await api.macros.create({ name, content });
                res = await api.macros.fetch({ paging: false });
                const { records: macros } = res.body;
                this.setState({ macros: macros });
            } catch (err) {
                // Ignore error
            }
        },
        deleteMacro: async (id) => {
            try {
                let res;
                res = await api.macros.delete(id);
                res = await api.macros.fetch({ paging: false });
                const { records: macros } = res.body;
                this.setState({ macros: macros });
            } catch (err) {
                // Ignore error
            }
        },
        updateMacro: async (id, { name, content }) => {
            try {
                let res;
                res = await api.macros.update(id, { name, content });
                res = await api.macros.fetch({ paging: false });
                const { records: macros } = res.body;
                this.setState({ macros: macros });
            } catch (err) {
                // Ignore error
            }
        },
        runMacro: (id, { name }) => {
            controller.command('macro:run', id, controller.context, (err, data) => {
                if (err) {
                    log.error(`Failed to run the macro: id=${id}, name="${name}"`);
                    return;
                }
            });
        },
        confirmLoadMacro: ({ name }) => confirm({
            title: i18n._('Load Macro'),
            body: (
                <div className={styles.macroLoad}>
                    <p>{i18n._('Are you sure you want to load this macro?')}</p>
                    <p>{name}</p>
                </div>
            ),
            btnConfirm: {
                text: i18n._('Yes')
            },
            btnCancel: {
                text: i18n._('No')
            }
        }),
        loadMacro: async (id, { name }) => {
            try {
                let res;
                res = await api.macros.read(id);
                const { name } = res.body;
                controller.command('macro:load', id, controller.context, (err, data) => {
                    if (err) {
                        log.error(`Failed to load the macro: id=${id}, name="${name}"`);
                        return;
                    }

                    const { gcode = '' } = { ...data };

                    pubsub.publish('gcode:load', {
                        name,
                        gcode: translateGCodeWithContext(gcode, controller.context)
                    });
                });
            } catch (err) {
                // Ignore error
            }
        },
        openAddMacroModal: () => {
            this.actions.openModal(MODAL_STATE_ADD_MACRO);
        },
        openRunMacroModal: (id) => {
            api.macros.read(id)
                .then((res) => {
                    const { id, name, content } = res.body;
                    this.actions.openModal(MODAL_STATE_RUN_MACRO, {
                        id,
                        name,
                        content
                    });
                });
        },
        openEditMacroModal: (id) => {
            api.macros.read(id)
                .then((res) => {
                    const { id, name, content } = res.body;
                    this.actions.openModal(MODAL_STATE_EDIT_MACRO, { id, name, content });
                });
        }
    };
    controllerEvents = {
        'workflow:state': (workflowState) => {
            if (this.state.workflowState !== workflowState) {
                this.setState({ workflowState: workflowState });
            }
        }
    };
    pubsubTokens = [];

    constructor() {
        super();
        this.state = this.getInitialState();
    }
    componentDidMount() {
        this.subscribe();
        this.addControllerEvents();

        // Fetch the list of macros
        this.actions.fetchMacros();
    }
    componentWillUnmount() {
        this.unsubscribe();
        this.removeControllerEvents();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    componentDidUpdate(prevProps, prevState) {
        const {
            minimized
        } = this.state;

        store.set('widgets.macro.minimized', minimized);
    }
    getInitialState() {
        return {
            minimized: store.get('widgets.macro.minimized', false),
            isFullscreen: false,
            port: controller.port,
            workflowState: controller.workflowState,
            macros: [],
            modalState: MODAL_STATE_NONE,
            modalParams: {}
        };
    }
    subscribe() {
        const tokens = [
            pubsub.subscribe('port', (msg, port) => {
                port = port || '';

                if (port) {
                    this.setState({ port: port });
                } else {
                    this.setState({ port: '' });
                }
            })
        ];
        this.pubsubTokens = this.pubsubTokens.concat(tokens);
    }
    unsubscribe() {
        this.pubsubTokens.forEach((token) => {
            pubsub.unsubscribe(token);
        });
        this.pubsubTokens = [];
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
    render() {
        const { minimized, isFullscreen } = this.state;
        const state = {
            ...this.state
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
                        {i18n._('Macro')}
                    </Widget.Title>
                    <Widget.Controls className={this.props.sortable.filterClassName}>
                        <Widget.Button
                            title={i18n._('New Macro')}
                            onClick={actions.openAddMacroModal}
                        >
                            <i className="fa fa-plus" />
                        </Widget.Button>
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
                    <Macro
                        state={state}
                        actions={actions}
                    />
                </Widget.Content>
            </Widget>
        );
    }
}

export default MacroWidget;
