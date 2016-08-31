import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import Validation from 'react-validation';
import i18n from '../../../lib/i18n';
import Modal from '../../common/Modal';
import styles from './index.styl';

// TODO
const HelpBlock = (props) => {
    const style = {
        color: '#A94442'
    };

    return (
        <div {...props} className="help-block" style={style} />
    );
};

Object.assign(Validation.rules, {
    required: {
        rule: (value = '') => {
            return value.trim();
        },
        hint: (value) => {
            return (
                <HelpBlock>{i18n._('This field cannot be blank')}</HelpBlock>
            );
        }
    }
});

@CSSModules(styles)
class AddMacro extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    render() {
        const sample = `G21  ; Set units to mm\nG90  ; Absolute positioning\nG1 Z1 F500  ; Move to clearance level`;
        const { actions } = this.props;

        return (
            <Modal
                backdrop
                onHide={actions.closeModal}
                style={{ minWidth: 640 }}
            >
                <Modal.Header
                    closeButton
                >
                    <Modal.Title>
                        {i18n._('Create a New Macro')}
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
                                value=""
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
                                value=""
                                placeholder={sample}
                                validations={['required']}
                            />
                        </div>
                    </Validation.components.Form>
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={actions.closeModal}
                    >
                        {i18n._('Cancel')}
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

                            actions.addMacro({ name, content });
                            actions.closeModal();
                        }}
                    >
                        {i18n._('OK')}
                    </button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export default AddMacro;
