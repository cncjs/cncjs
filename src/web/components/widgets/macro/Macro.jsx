import { parseString } from 'gcode-parser';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import confirm from '../../../lib/confirm';
import controller from '../../../lib/controller';
import i18n from '../../../lib/i18n';
import log from '../../../lib/log';
import AddMacro from './AddMacro';
import EditMacro from './EditMacro';
import {
    MODAL_STATE_ADD_MACRO,
    MODAL_STATE_EDIT_MACRO
} from './constants';
import styles from './index.styl';

const runMacro = (content) => {
    parseString(content, (err, lines) => {
        if (err) {
            log.error(err);
            return;
        }

        lines.forEach(({ line }) => {
            controller.command('gcode', line);
        });
    });
};

@CSSModules(styles, { allowMultiple: true })
class Macro extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    render() {
        const { state, actions } = this.props;
        const { macros = [], modalState } = state;
        const canRun = state.port;
        const canStop = state.port;

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
                        <div className="col-xs-5">
                            <button
                                type="button"
                                className="btn btn-xs btn-danger"
                                disabled={!canStop}
                            >
                                {i18n._('Emergency Stop')}
                            </button>
                        </div>
                        <div className="col-xs-7 text-right">
                            <button
                                type="button"
                                className="btn btn-xs btn-default"
                                onClick={() => {
                                    actions.openModal(MODAL_STATE_ADD_MACRO);
                                }}
                            >
                                <i className="fa fa-plus" />
                                &nbsp;
                                {i18n._('Add Macro')}
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
                                    {i18n._('Macro')}
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
                                            {i18n._('No macros available')}
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
                                            disabled={!canRun}
                                            onClick={() => {
                                                confirm({
                                                    header: i18n._('Run Macro'),
                                                    body: (
                                                        <div className={styles['macro-run']}>
                                                            <p>{i18n._('Are you sure you want to run this macro?')}</p>
                                                            <p>{macro.name}</p>
                                                        </div>
                                                    ),
                                                    btnOKClass: 'btn-primary',
                                                    btnCancelClass: 'btn-default',
                                                    txtOK: i18n._('Run'),
                                                    txtCancel: i18n._('Cancel')
                                                }, () => {
                                                    runMacro(macro.content);
                                                });
                                            }}
                                        >
                                            <i className="fa fa-play" />
                                        </button>
                                        {macro.name}
                                    </td>
                                    <td>
                                        <div className="nowrap">
                                            <button
                                                type="button"
                                                className="btn btn-xs btn-default"
                                                onClick={() => {
                                                    actions.openModal(MODAL_STATE_EDIT_MACRO, {
                                                        id: macro.id
                                                    });
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
