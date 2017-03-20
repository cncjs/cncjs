import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import i18n from '../../lib/i18n';
import AddMacro from './AddMacro';
import EditMacro from './EditMacro';
import RunMacro from './RunMacro';
import {
    MODAL_STATE_ADD_MACRO,
    MODAL_STATE_EDIT_MACRO,
    MODAL_STATE_RUN_MACRO
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
    render() {
        const { state, actions } = this.props;
        const { port, workflowState, macros = [], modalState } = state;
        const canClick = port && workflowState === WORKFLOW_STATE_IDLE;

        return (
            <div>
                {modalState === MODAL_STATE_ADD_MACRO &&
                <AddMacro {...this.props} />
                }
                {modalState === MODAL_STATE_EDIT_MACRO &&
                <EditMacro {...this.props} />
                }
                {modalState === MODAL_STATE_RUN_MACRO &&
                <RunMacro {...this.props} />
                }
                <div className={styles.toolbar}>
                    <div className={styles.toolbarButtonGroup}>
                        <button
                            type="button"
                            className="btn btn-xs btn-default"
                            onClick={actions.openAddMacroModal}
                        >
                            {i18n._('New Macro')}
                        </button>
                    </div>
                    <div className={styles.toolbarRecords}>
                        {i18n._('Total: {{total}}', { total: macros.length })}
                    </div>
                </div>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <tbody>
                            {macros.length === 0 &&
                                <tr>
                                    <td colSpan="2">
                                        <div className={styles.emptyResult}>
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
                                            disabled={!canClick}
                                            onClick={() => {
                                                const { id } = macro;
                                                actions.openRunMacroModal(id);
                                            }}
                                            title={i18n._('Run Macro')}
                                        >
                                            <i className="fa fa-play" />
                                        </button>
                                        <span className="space" />
                                        {macro.name}
                                    </td>
                                    <td style={{ width: '1%' }}>
                                        <div className="nowrap">
                                            <button
                                                type="button"
                                                className="btn btn-xs btn-default"
                                                disabled={!canClick}
                                                onClick={() => {
                                                    const { id, name } = macro;
                                                    actions.confirmLoadMacro({ name })
                                                        .then(() => {
                                                            actions.loadMacro(id, { name });
                                                        });
                                                }}
                                                title={i18n._('Load Macro')}
                                            >
                                                <i className="fa fa-chevron-up" />
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-xs btn-default"
                                                onClick={() => {
                                                    actions.openEditMacroModal(macro.id);
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
