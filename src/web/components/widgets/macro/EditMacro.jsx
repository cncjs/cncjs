import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import Validation from 'react-validation';
import confirm from '../../../lib/confirm';
import i18n from '../../../lib/i18n';
import Modal from '../../common/Modal';
import styles from './index.styl';

@CSSModules(styles)
class EditMacro extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    render() {
        const sample = `G0 X1 Y1\nG1 Y2 F100\nG1 X2 F100\nG1 Y1 F100\nG1 X1 F100`;
        const { state, actions } = this.props;
        const { modalParams } = state;
        const { id, name, content } = { ...modalParams };

        return (
            <Modal
                backdrop
                onHide={() => {
                    actions.closeModal();
                }}
                style={{ minWidth: 640 }}
            >
                <Modal.Header
                    closeButton
                >
                    <Modal.Title>
                        {i18n._('Edit Macro')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Validation.components.Form
                        ref="form"
                        onSubmit={(event) => {
                            event.preventDefault();
                        }}
                    >
                        <div className="form-group">
                            <label>{i18n._('Macro Name')}</label>
                            <Validation.components.Input
                                ref="name"
                                type="text"
                                className="form-control"
                                name="name"
                                value={name}
                                placeholder={i18n._('Macro Name')}
                                validations={['required']}
                            />
                        </div>
                        <div className="form-group">
                            <label>{i18n._('G-code')}</label>
                            <Validation.components.Textarea
                                ref="content"
                                rows="10"
                                className="form-control"
                                name="content"
                                value={content}
                                placeholder={sample}
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
                                header: i18n._('Delete Macro'),
                                body: i18n._('Are you sure you want to delete this macro?'),
                                btnOKClass: 'btn-danger',
                                btnCancelClass: 'btn-default',
                                txtOK: i18n._('Delete'),
                                txtCancel: i18n._('Cancel')
                            }, () => {
                                actions.deleteMacro({ id });
                                actions.closeModal();
                            });
                        }}
                    >
                        {i18n._('Delete')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                            const form = this.refs.form;

                            if (_.size(form.state.errors) > 0) {
                                return;
                            }

                            form.validateAll();

                            if (_.size(form.state.errors) > 0) {
                                return;
                            }

                            const name = _.get(form.state, 'states.name.value');
                            const content = _.get(form.state, 'states.content.value');

                            actions.updateMacro({ id, name, content });
                            actions.closeModal();
                        }}
                    >
                        {i18n._('Save')}
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
                </Modal.Footer>
            </Modal>
        );
    }
}

export default EditMacro;
