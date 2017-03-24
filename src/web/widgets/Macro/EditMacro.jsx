import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import shallowCompare from 'react-addons-shallow-compare';
import { Dropdown, MenuItem } from 'react-bootstrap';
import confirm from '../../lib/confirm';
import i18n from '../../lib/i18n';
import Modal from '../../components/Modal';
import Validation from '../../lib/react-validation';
import insertAtCaret from './insertAtCaret';
import variables from './variables';
import styles from './index.styl';

class EditMacro extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };
    fields = {
        name: null,
        content: null
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { state, actions } = this.props;
        const { modalParams } = state;
        const { id, name, content } = { ...modalParams };

        return (
            <Modal
                onClose={actions.closeModal}
                size="md"
            >
                <Modal.Header>
                    <Modal.Title>
                        {i18n._('Edit Macro')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Validation.components.Form
                        ref={c => {
                            this.form = c;
                        }}
                        onSubmit={(event) => {
                            event.preventDefault();
                        }}
                    >
                        <div className="form-group">
                            <label>{i18n._('Macro Name')}</label>
                            <Validation.components.Input
                                ref={c => {
                                    this.fields.name = c;
                                }}
                                type="text"
                                className="form-control"
                                errorClassName="is-invalid-input"
                                containerClassName=""
                                name="name"
                                value={name}
                                validations={['required']}
                            />
                        </div>
                        <div className="form-group">
                            <div>
                                <label>{i18n._('Macro Commands')}</label>
                                <Dropdown
                                    id="edit-macro-dropdown"
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
                                        className={styles.btnLink}
                                        style={{ boxShadow: 'none' }}
                                        useAnchor
                                        noCaret
                                    >
                                        <i className="fa fa-plus" />
                                        <span className="space" />
                                        {i18n._('Macro Variables')}
                                        <span className="space" />
                                        <i className="fa fa-caret-down" />
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu className={styles.macroVariablesDropdown}>
                                        {variables.map(v =>
                                            <MenuItem eventKey={v} key={v}>
                                                {v}
                                            </MenuItem>
                                        )}
                                    </Dropdown.Menu>
                                </Dropdown>
                            </div>
                            <Validation.components.Textarea
                                ref={c => {
                                    this.fields.content = c;
                                }}
                                rows="10"
                                className="form-control"
                                errorClassName="is-invalid-input"
                                containerClassName=""
                                name="content"
                                value={content}
                                validations={['required']}
                            />
                        </div>
                    </Validation.components.Form>
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type="button"
                        className="btn btn-danger pull-left"
                        onClick={() => {
                            confirm({
                                title: i18n._('Delete Macro'),
                                body: i18n._('Are you sure you want to delete this macro?'),
                                btnConfirm: {
                                    btnStyle: 'danger',
                                    text: i18n._('Yes')
                                },
                                btnCancel: {
                                    text: i18n._('No')
                                }
                            }).then(() => {
                                actions.deleteMacro(id);
                                actions.closeModal();
                            });
                        }}
                    >
                        {i18n._('Delete')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={() => {
                            actions.closeModal();
                        }}
                    >
                        {i18n._('Cancel')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                            if (Object.keys(this.form.state.errors).length > 0) {
                                return;
                            }

                            this.form.validateAll();

                            if (Object.keys(this.form.state.errors).length > 0) {
                                return;
                            }

                            const name = _.get(this.fields.name, 'state.value');
                            const content = _.get(this.fields.content, 'state.value');

                            actions.updateMacro(id, { name, content });
                            actions.closeModal();
                        }}
                    >
                        {i18n._('Save Changes')}
                    </button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export default EditMacro;
