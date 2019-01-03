import chainedFunction from 'chained-function';
import get from 'lodash/get';
import uniqueId from 'lodash/uniqueId';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import Dropdown, { MenuItem } from 'app/components/Dropdown';
import { Button } from 'app/components/Buttons';
import Modal from 'app/components/Modal';
import Space from 'app/components/Space';
import { Form, Input, Textarea } from 'app/components/Validation';
import i18n from 'app/lib/i18n';
import portal from 'app/lib/portal';
import * as validations from 'app/lib/validations';
import insertAtCaret from './insertAtCaret';
import variables from './variables';

class EditMacro extends PureComponent {
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
        const { id, name, content } = { ...state.modal.params };

        return (
            <Modal size="md" onClose={actions.closeModal}>
                <Modal.Header>
                    <Modal.Title>
                        {i18n._('Edit Macro')}
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
                                value={name}
                                validations={[validations.required]}
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
                                        btnStyle="link"
                                        noCaret
                                    >
                                        <i className="fa fa-plus" />
                                        <Space width="8" />
                                        {i18n._('Macro Variables')}
                                        <Space width="4" />
                                        <i className="fa fa-caret-down" />
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu
                                        style={{
                                            maxHeight: 180,
                                            overflowY: 'auto'
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
                        btnStyle="danger"
                        className="pull-left"
                        onClick={() => {
                            const name = get(this.fields.name, 'value');

                            portal(({ onClose }) => (
                                <Modal size="xs" onClose={onClose}>
                                    <Modal.Header>
                                        <Modal.Title>
                                            {i18n._('Delete Macro')}
                                        </Modal.Title>
                                    </Modal.Header>
                                    <Modal.Body>
                                        {i18n._('Are you sure you want to delete this macro?')}
                                        <p><strong>{name}</strong></p>
                                    </Modal.Body>
                                    <Modal.Footer>
                                        <Button onClick={onClose}>
                                            {i18n._('No')}
                                        </Button>
                                        <Button
                                            btnStyle="danger"
                                            onClick={chainedFunction(
                                                () => {
                                                    actions.deleteMacro(id);
                                                    actions.closeModal();
                                                },
                                                onClose
                                            )}
                                        >
                                            {i18n._('Yes')}
                                        </Button>
                                    </Modal.Footer>
                                </Modal>
                            ));
                        }}
                    >
                        {i18n._('Delete')}
                    </Button>
                    <Button
                        onClick={() => {
                            actions.closeModal();
                        }}
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

                                actions.updateMacro(id, { name, content });
                                actions.closeModal();
                            });
                        }}
                    >
                        {i18n._('Save Changes')}
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export default EditMacro;
