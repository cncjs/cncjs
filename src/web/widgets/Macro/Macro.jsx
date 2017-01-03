import pubsub from 'pubsub-js';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
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

class Macro extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
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
            confirmText: i18n._('Yes'),
            cancelText: i18n._('No')
        });
    }
    handleLoadMacro({ id, name, content }) {
        const gcode = content;

        controller.command('loadmacro', id, (err, data) => {
            if (err) {
                log.error(`Failed to load the macro: id=${id}, name="${name}"`);
                return;
            }

            pubsub.publish('gcode:load', { name, gcode });
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
                <div className={styles.toolbar}>
                    <div className={styles['toolbar-button-group']}>
                        <button
                            type="button"
                            className="btn btn-xs btn-default"
                            onClick={() => {
                                actions.openModal(MODAL_STATE_ADD_MACRO);
                            }}
                        >
                            <i className="fa fa-plus" />
                            <span className="space" />
                            {i18n._('Create Macro')}
                        </button>
                    </div>
                    <div className={styles['toolbar-records']}>
                        {i18n._('Total: {{total}}', { total: macros.length })}
                    </div>
                </div>
                <div className={styles['table-container']}>
                    <table className={styles.table}>
                        <tbody>
                            {macros.length === 0 &&
                                <tr>
                                    <td colSpan="2">
                                        <div className={styles['empty-result']}>
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
                                            <i className="fa fa-arrow-circle-o-up" style={{ fontSize: 16 }} />
                                        </button>
                                        {macro.name}
                                    </td>
                                    <td style={{ width: '1%' }}>
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
