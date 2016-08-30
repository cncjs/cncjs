import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import Validation from 'react-validation';
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
        const { state, actions } = this.props;
        const { macros, modalParams } = state;
        const { id } = { ...modalParams };
        const macro = _.find(macros, { id: id });

        return (
            <Modal
                backdrop
                onHide={() => {
                    actions.closeModal();
                }}
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
                            <label>{i18n._('Name')}</label>
                            <Validation.components.Input
                                ref="name"
                                type="text"
                                className="form-control"
                                name="name"
                                defaultValue={macro.name}
                                placeholder={i18n._('Name')}
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
                                defaultValue={macro.content}
                                placeholder={i18n._('G-code')}
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
                            actions.removeMacro({ id });
                            actions.closeModal();
                        }}
                    >
                        {i18n._('Delete')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                            const form = this.refs.form;

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
