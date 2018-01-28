import cx from 'classnames';
import PropTypes from 'prop-types';
import Slider from 'rc-slider';
import React, { PureComponent } from 'react';
import Modal from '../../../../components/Modal';
import Space from '../../../../components/Space';
import { ToastNotification } from '../../../../components/Notifications';
import { Form, Input, Textarea } from '../../../../components/Validation';
import i18n from '../../../../lib/i18n';
import * as validations from '../../../../lib/validations';
import styles from '../form.styl';

class UpdateRecord extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        action: PropTypes.object
    };

    slider = null;

    get value() {
        const {
            name,
            command
        } = this.form.getValues();

        return {
            name: name,
            command: command,
            grid: {
                xs: this.slider.state.value
            }
        };
    }
    render() {
        const { state, action } = this.props;
        const { modal } = state;
        const {
            alertMessage,
            name,
            command,
            grid
        } = modal.params;

        return (
            <Modal
                disableOverlay
                size="sm"
                onClose={action.closeModal}
            >
                <Modal.Header>
                    <Modal.Title>
                        {i18n._('Custom Commands')}
                        <Space width="8" />
                        &rsaquo;
                        <Space width="8" />
                        {i18n._('Update')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {alertMessage &&
                    <ToastNotification
                        style={{ margin: '-16px -24px 10px -24px' }}
                        type="error"
                        onDismiss={() => {
                            action.updateModalParams({ alertMessage: '' });
                        }}
                    >
                        {alertMessage}
                    </ToastNotification>
                    }
                    <Form
                        ref={node => {
                            this.form = node;
                        }}
                        onSubmit={(event) => {
                            event.preventDefault();
                        }}
                    >
                        <div className={styles.formFields}>
                            <div className={styles.formGroup}>
                                <label>{i18n._('Name')}</label>
                                <Input
                                    type="text"
                                    name="name"
                                    value={name}
                                    className={cx(
                                        'form-control',
                                        styles.formControl,
                                        styles.short
                                    )}
                                    validations={[validations.required]}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>{i18n._('Command')}</label>
                                <Textarea
                                    name="command"
                                    value={command}
                                    rows="5"
                                    className={cx(
                                        'form-control',
                                        styles.formControl,
                                        styles.long
                                    )}
                                    validations={[validations.required]}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>{i18n._('Button Width')}</label>
                                <Slider
                                    ref={node => {
                                        this.slider = node;
                                    }}
                                    dots
                                    marks={{
                                        1: (<span><sup>1</sup>/<sub>12</sub></span>),
                                        2: (<span><sup>1</sup>/<sub>6</sub></span>),
                                        3: (<span><sup>1</sup>/<sub>4</sub></span>),
                                        4: (<span><sup>1</sup>/<sub>3</sub></span>),
                                        5: (<span><sup>5</sup>/<sub>12</sub></span>),
                                        6: (<span><sup>1</sup>/<sub>2</sub></span>),
                                        7: (<span><sup>7</sup>/<sub>12</sub></span>),
                                        8: (<span><sup>2</sup>/<sub>3</sub></span>),
                                        9: (<span><sup>3</sup>/<sub>4</sub></span>),
                                        10: (<span><sup>5</sup>/<sub>6</sub></span>),
                                        11: (<span><sup>11</sup>/<sub>12</sub></span>),
                                        12: '100%'
                                    }}
                                    included={false}
                                    defaultValue={grid.xs}
                                    min={1}
                                    max={12}
                                    step={1}
                                />
                            </div>
                        </div>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={action.closeModal}
                    >
                        {i18n._('Cancel')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                            this.form.validate(err => {
                                if (err) {
                                    return;
                                }

                                const { id } = modal.params;
                                const { name, command, grid } = this.value;

                                action.updateRecord(id, { name, command, grid });
                            });
                        }}
                    >
                        {i18n._('OK')}
                    </button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export default UpdateRecord;
