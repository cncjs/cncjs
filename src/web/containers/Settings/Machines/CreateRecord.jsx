import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Form, Field } from 'react-final-form';
import FormGroup from 'web/components/FormGroup';
import SectionGroup from 'web/components/SectionGroup';
import SectionTitle from 'web/components/SectionTitle';
import Input from 'web/components/FormControl/Input';
import { FlexContainer, Row, Col } from 'web/components/GridSystem';
import Margin from 'web/components/Margin';
import Modal from 'web/components/Modal';
import { ToastNotification } from 'web/components/Notifications';
import Space from 'web/components/Space';
import ToggleSwitch from 'web/components/ToggleSwitch';
import i18n from 'web/lib/i18n';
import Error from '../common/Error';
import * as validations from '../common/validations';
import Axis from './Axis';

class CreateRecord extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    state = this.getInitialState();

    getInitialState() {
        return {
            values: {
                enabled: true,
                name: '',
                xmin: 0,
                xmax: 0,
                ymin: 0,
                ymax: 0,
                zmin: 0,
                zmax: 0
            }
        };
    }

    onSubmit = (values) => {
        const { createRecord } = this.props.actions;
        const { enabled, name, xmin, xmax, ymin, ymax, zmin, zmax } = values;

        createRecord({
            enabled,
            name,
            xmin: Number(xmin) || 0,
            xmax: Number(xmax) || 0,
            ymin: Number(ymin) || 0,
            ymax: Number(ymax) || 0,
            zmin: Number(zmin) || 0,
            zmax: Number(zmax) || 0,
        });
    };

    renderMachineTravelLimits = () => (
        <FlexContainer fluid gutterWidth={0}>
            <Row>
                <Col>
                    <Field name="xmin">
                        {({ input, meta }) => (
                            <FormGroup>
                                <label><Axis value="X" sub="min" /></label>
                                <Input {...input} type="number" />
                                {meta.touched && meta.error && <Error>{meta.error}</Error>}
                            </FormGroup>
                        )}
                    </Field>
                </Col>
                <Col width="auto" style={{ width: 16 }} />
                <Col>
                    <Field name="xmax">
                        {({ input, meta }) => (
                            <FormGroup>
                                <label><Axis value="X" sub="max" /></label>
                                <Input {...input} type="number" />
                                {meta.touched && meta.error && <Error>{meta.error}</Error>}
                            </FormGroup>
                        )}
                    </Field>
                </Col>
            </Row>
            <Row>
                <Col>
                    <Field name="ymin">
                        {({ input, meta }) => (
                            <FormGroup>
                                <label><Axis value="Y" sub="min" /></label>
                                <Input {...input} type="number" />
                                {meta.touched && meta.error && <Error>{meta.error}</Error>}
                            </FormGroup>
                        )}
                    </Field>
                </Col>
                <Col width="auto" style={{ width: 16 }} />
                <Col>
                    <Field name="ymax">
                        {({ input, meta }) => (
                            <FormGroup>
                                <label><Axis value="Y" sub="max" /></label>
                                <Input {...input} type="number" />
                                {meta.touched && meta.error && <Error>{meta.error}</Error>}
                            </FormGroup>
                        )}
                    </Field>
                </Col>
            </Row>
            <Row>
                <Col>
                    <Field name="zmin">
                        {({ input, meta }) => (
                            <FormGroup>
                                <label><Axis value="Z" sub="min" /></label>
                                <Input {...input} type="number" />
                                {meta.touched && meta.error && <Error>{meta.error}</Error>}
                            </FormGroup>
                        )}
                    </Field>
                </Col>
                <Col width="auto" style={{ width: 16 }} />
                <Col>
                    <Field name="zmax">
                        {({ input, meta }) => (
                            <FormGroup>
                                <label><Axis value="Z" sub="max" /></label>
                                <Input {...input} type="number" />
                                {meta.touched && meta.error && <Error>{meta.error}</Error>}
                            </FormGroup>
                        )}
                    </Field>
                </Col>
            </Row>
        </FlexContainer>
    );

    render() {
        const { closeModal, updateModalParams } = this.props.actions;
        const { alertMessage } = this.props.state.modal.params;

        return (
            <Modal disableOverlay onClose={closeModal}>
                <Form
                    initialValues={this.state.values}
                    onSubmit={this.onSubmit}
                    render={({ handleSubmit, pristine, invalid }) => (
                        <div>
                            <Modal.Header>
                                <Modal.Title>
                                    {i18n._('Machine Profiles')}
                                    <Space width="8" />
                                    &rsaquo;
                                    <Space width="8" />
                                    {i18n._('New')}
                                </Modal.Title>
                            </Modal.Header>
                            <Modal.Body>
                                {alertMessage &&
                                <ToastNotification
                                    style={{ margin: '-16px -24px 10px -24px' }}
                                    type="error"
                                    onDismiss={() => {
                                        updateModalParams({ alertMessage: '' });
                                    }}
                                >
                                    {alertMessage}
                                </ToastNotification>
                                }
                                <SectionGroup>
                                    <Field name="enabled">
                                        {({ input: { value, onChange }, meta }) => {
                                            const on = !!value;

                                            return (
                                                <FormGroup>
                                                    <ToggleSwitch
                                                        size="sm"
                                                        checked={on}
                                                        onChange={() => onChange(!on)}
                                                    />
                                                    {on ? i18n._('ON') : i18n._('OFF')}
                                                </FormGroup>
                                            );
                                        }}
                                    </Field>
                                    <Field name="name" validate={validations.required}>
                                        {({ input, meta }) => (
                                            <FormGroup>
                                                <label>{i18n._('Name')}</label>
                                                <Input {...input} type="text" />
                                                {meta.touched && meta.error && <Error>{meta.error}</Error>}
                                            </FormGroup>
                                        )}
                                    </Field>
                                </SectionGroup>
                                <SectionGroup style={{ marginBottom: 0 }}>
                                    <SectionTitle>{i18n._('Machine Travel Limits')}</SectionTitle>
                                    <Margin left={24}>
                                        {this.renderMachineTravelLimits()}
                                    </Margin>
                                </SectionGroup>
                            </Modal.Body>
                            <Modal.Footer>
                                <button
                                    type="button"
                                    className="btn btn-default"
                                    onClick={closeModal}
                                >
                                    {i18n._('Cancel')}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    disabled={pristine || invalid}
                                    onClick={handleSubmit}
                                >
                                    {i18n._('OK')}
                                </button>
                            </Modal.Footer>
                        </div>
                    )}
                />
            </Modal>
        );
    }
}

export default CreateRecord;
