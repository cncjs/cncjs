import uniqueId from 'lodash/uniqueId';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import { Button } from 'app/components/Buttons';
import Dropdown, { MenuItem } from 'app/components/Dropdown';
import Modal from 'app/components/Modal';
import { Form, Input, Textarea } from 'app/components/Validation';
import i18n from 'app/lib/i18n';
import * as validations from 'app/lib/validations';
import insertAtCaret from './insertAtCaret';
import variables from './variables';
import styles from './index.styl';

class AddMacro extends PureComponent {
    static propTypes = {
      state: PropTypes.object,
      actions: PropTypes.object
    };

    fields = {
      name: null,
      content: null
    };

    get value() {
      const {
        name,
        content
      } = this.form.getValues();

      return {
        name: name,
        content: content
      };
    }

    render() {
      const { state, actions } = this.props;
      const { content = '' } = { ...state.modal.params };

      return (
        <Modal disableOverlay size="md" onClose={actions.closeModal}>
          <Modal.Header>
            <Modal.Title>
              {i18n._('New Macro')}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form
              ref={c => {
                this.form = c;
              }}
              onSubmit={(event) => {
                event.preventDefault();
              }}
            >
              <div className="form-group">
                <label>{i18n._('Macro Name')}</label>
                <Input
                  ref={c => {
                    this.fields.name = c;
                  }}
                  type="text"
                  className="form-control"
                  name="name"
                  value=""
                  validations={[validations.required]}
                />
              </div>
              <div className="form-group">
                <div>
                  <label>{i18n._('Macro Commands')}</label>
                  <Dropdown
                    className="pull-right"
                    onSelect={(eventKey) => {
                      const textarea = ReactDOM.findDOMNode(this.fields.content).querySelector('textarea');
                      if (textarea) {
                        insertAtCaret(textarea, eventKey);
                      }

                      actions.updateModalParams({
                        content: textarea.value
                      });
                    }}
                    pullRight
                  >
                    <Dropdown.Toggle
                      btnStyle="link"
                      btnSize="xs"
                    >
                      <i className="fa fa-plus" />
                      {i18n._('Macro Variables')}
                    </Dropdown.Toggle>
                    <Dropdown.Menu
                      className={styles.macroVariablesDropdown}
                      style={{
                        minWidth: 'max-content',
                      }}
                    >
                      {variables.map(v => {
                        if (typeof v === 'object') {
                          return (
                            <MenuItem
                              header={v.type === 'header'}
                              key={uniqueId()}
                            >
                              {v.text}
                            </MenuItem>
                          );
                        }

                        return (
                          <MenuItem
                            eventKey={v}
                            key={uniqueId()}
                          >
                            {v}
                          </MenuItem>
                        );
                      })}
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
                <Textarea
                  ref={c => {
                    this.fields.content = c;
                  }}
                  rows="10"
                  className="form-control"
                  name="content"
                  value={content}
                  validations={[validations.required]}
                />
              </div>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button
              onClick={actions.closeModal}
            >
              {i18n._('Cancel')}
            </Button>
            <Button
              btnStyle="primary"
              onClick={() => {
                this.form.validate(err => {
                  if (err) {
                    return;
                  }

                  const { name, content } = this.value;

                  actions.addMacro({ name, content });
                  actions.closeModal();
                });
              }}
            >
              {i18n._('OK')}
            </Button>
          </Modal.Footer>
        </Modal>
      );
    }
}

export default AddMacro;
