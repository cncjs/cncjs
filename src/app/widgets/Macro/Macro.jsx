import chainedFunction from 'chained-function';
import { ensureArray } from 'ensure-type';
import includes from 'lodash/includes';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Button } from 'app/components/Buttons';
import Modal from 'app/components/Modal';
import Space from 'app/components/Space';
import i18n from 'app/lib/i18n';
import portal from 'app/lib/portal';
import {
  // Workflow
  WORKFLOW_STATE_IDLE,
  WORKFLOW_STATE_PAUSED
} from '../../constants';
import styles from './index.styl';

class Macro extends PureComponent {
    static propTypes = {
      state: PropTypes.object,
      actions: PropTypes.object
    };

    handleRunMacro = (macro) => (event) => {
      const { actions } = this.props;
      actions.openRunMacroModal(macro.id);
    };

    handleLoadMacro = (macro) => (event) => {
      const { id, name } = macro;
      portal(({ onClose }) => (
        <Modal disableOverlay size="xs" onClose={onClose}>
          <Modal.Header>
            <Modal.Title>
              {i18n._('Load Macro')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {i18n._('Are you sure you want to load this macro?')}
            <p><strong>{name}</strong></p>
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={onClose}
            >
              {i18n._('No')}
            </Button>
            <Button
              btnStyle="primary"
              onClick={chainedFunction(
                () => {
                  const { actions } = this.props;
                  actions.loadMacro(id, { name });
                },
                onClose
              )}
            >
              {i18n._('Yes')}
            </Button>
          </Modal.Footer>
        </Modal>
      ));
    };

    handleEditMacro = (macro) => (event) => {
      const { actions } = this.props;
      actions.openEditMacroModal(macro.id);
    };

    render() {
      const { state } = this.props;
      const {
        canClick,
        workflow,
        macros = []
      } = state;
      const canRunMacro = canClick && includes([WORKFLOW_STATE_IDLE, WORKFLOW_STATE_PAUSED], workflow.state);
      const canLoadMacro = canClick && includes([WORKFLOW_STATE_IDLE], workflow.state);

      return (
        <div>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <tbody>
                {macros.length === 0 && (
                  <tr>
                    <td colSpan="2">
                      <div className={styles.emptyResult}>
                        {i18n._('No macros')}
                      </div>
                    </td>
                  </tr>
                )}
                {ensureArray(macros).map((macro, index) => (
                  <tr key={macro.id}>
                    <td>
                      <Button
                        compact
                        btnSize="xs"
                        btnStyle="flat"
                        disabled={!canRunMacro}
                        onClick={this.handleRunMacro(macro)}
                        title={i18n._('Run Macro')}
                      >
                        <i className="fa fa-play" />
                      </Button>
                      <Space width="8" />
                      {macro.name}
                    </td>
                    <td style={{ width: '1%' }}>
                      <div className="nowrap">
                        <Button
                          compact
                          btnSize="xs"
                          btnStyle="flat"
                          disabled={!canLoadMacro}
                          onClick={this.handleLoadMacro(macro)}
                          title={i18n._('Load Macro')}
                        >
                          <i className="fa fa-chevron-up" />
                        </Button>
                        <Button
                          compact
                          btnSize="xs"
                          btnStyle="flat"
                          onClick={this.handleEditMacro(macro)}
                        >
                          <i className="fa fa-edit" />
                        </Button>
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
