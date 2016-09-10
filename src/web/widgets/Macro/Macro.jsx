import _ from 'lodash';
import pubsub from 'pubsub-js';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import api from '../../api';
import confirm from '../../lib/confirm';
import controller from '../../lib/controller';
import i18n from '../../lib/i18n';
import log from '../../lib/log';
import AddMacro from './AddMacro';
import EditMacro from './EditMacro';
import {
    MODAL_STATE_ADD_MACRO,
    MODAL_STATE_EDIT_MACRO
} from './constants';
import {
    WORKFLOW_STATE_IDLE
} from '../../constants';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class Macro extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props);
    }
    confirmLoadMacro({ name }) {
        return confirm({
            title: i18n._('Macro'),
            body: (
                <div className={styles['macro-load']}>
                    <p>{i18n._('Are you sure you want to load this macro?')}</p>
                    <p>{name}</p>
                </div>
            ),
            confirmText: i18n._('OK'),
            cancelText: i18n._('Cancel')
        });
    }
    handleLoadMacro({ id, name, content }) {
        controller.command('macro', id, (err) => {
            if (err) {
                log.error('Failed to load the macro: id=${id}, name="${name}"');
                return;
            }

            const gcode = content;
            pubsub.publish('gcode:load', gcode);
        });
    }
    handleEditMacro({ id }) {
        const { actions } = this.props;

        api.getMacro({ id: id })
            .then((res) => {
                const { id, name, content } = res.body;
                actions.openModal(MODAL_STATE_EDIT_MACRO, { id, name, content });
            });
    }
    render() {
        const { state, actions } = this.props;
        const { port, workflowState, macros = [], modalState } = state;
        const canLoadMacro = port && workflowState === WORKFLOW_STATE_IDLE;

        return (
            <div>
            {modalState === MODAL_STATE_ADD_MACRO &&
                <AddMacro {...this.props} />
            }
            {modalState === MODAL_STATE_EDIT_MACRO &&
                <EditMacro {...this.props} />
            }
                <div styleName="toolbar">
                    <div className="row no-gutters">
                        <div className="col-xs-12 text-right">
                            <button
                                type="button"
                                className="btn btn-xs btn-default"
                                onClick={() => {
                                    actions.openModal(MODAL_STATE_ADD_MACRO);
                                }}
                            >
                                <i className="fa fa-plus" />
                                &nbsp;
                                {i18n._('Create Macro')}
                            </button>
                        </div>
                    </div>
                </div>
                <div styleName="table-container">
                    <table
                        styleName="table table-bordered"
                        style={{ border: 0 }}
                    >
                        <thead>
                            <tr>
                                <th>
                                    {i18n._('Total: {{total}}', { total: macros.length })}
                                </th>
                                <th style={{ width: '1%' }}>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {macros.length === 0 &&
                                <tr>
                                    <td colSpan="2">
                                        <div styleName="empty-result">
                                            {i18n._('No macros')}
                                        </div>
                                    </td>
                                </tr>
                            }
                            {macros.length > 0 && macros.map((macro, index) => (
                                <tr key={macro.id}>
                                    <td>
                                        <button
                                            type="button"
                                            className="btn btn-xs btn-default"
                                            style={{ marginRight: 10 }}
                                            disabled={!canLoadMacro}
                                            onClick={() => {
                                                this.confirmLoadMacro({ name: macro.name })
                                                    .then(() => {
                                                        return api.getMacro({ id: macro.id });
                                                    })
                                                    .then((res) => {
                                                        const { id, name, content } = res.body;
                                                        this.handleLoadMacro({ id, name, content });
                                                    });
                                            }}
                                            title={i18n._('Run Macro')}
                                        >
                                            <i className="fa fa-arrow-circle-o-up" style={{ fontSize: 14 }} />
                                        </button>
                                        {macro.name}
                                    </td>
                                    <td>
                                        <div className="nowrap">
                                            <button
                                                type="button"
                                                className="btn btn-xs btn-default"
                                                onClick={() => {
                                                    this.handleEditMacro({ id: macro.id });
                                                }}
                                            >
                                                <i className="fa fa-edit" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
}

export default Macro;
