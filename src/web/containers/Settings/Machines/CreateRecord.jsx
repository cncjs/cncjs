import _ from 'lodash';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import FormGroup from 'web/components/FormGroup';
import SectionGroup from 'web/components/SectionGroup';
import SectionTitle from 'web/components/SectionTitle';
import { FlexContainer, Row, Col } from 'web/components/GridSystem';
import Margin from 'web/components/Margin';
import Modal from 'web/components/Modal';
import Space from 'web/components/Space';
import { ToastNotification } from 'web/components/Notifications';
import ToggleSwitch from 'web/components/ToggleSwitch';
import { Form, Input } from 'web/components/Validation';
import i18n from 'web/lib/i18n';
import * as validations from 'web/lib/validations';

const Axis = ({ value, sub }) => (
    <div>{value}<sub style={{ marginLeft: 2 }}>{sub}</sub></div>
);

class CreateRecord extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    fields = {
        enabled: null,
    };

    get value() {
        const {
            name,
            xmin,
            xmax,
            ymin,
            ymax,
            zmin,
            zmax,
        } = this.form.getValues();

        return {
            enabled: !!_.get(this.fields.enabled, 'state.checked'),
            name,
            xmin,
            xmax,
            ymin,
            ymax,
            zmin,
            zmax,
        };
    }

    render() {
        const { state, actions } = this.props;
        const { modal } = state;
        const {
            alertMessage,
            enabled = true,
            name = '',
            xmin = '',
            xmax = '',
            ymin = '',
            ymax = '',
            zmin = '',
            zmax = '',
        } = modal.params;

        return (
            <Modal disableOverlay onClose={actions.closeModal}>
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
                            actions.updateModalParams({ alertMessage: '' });
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
                        <SectionGroup>
                            <FormGroup>
                                <label>{i18n._('Enabled')}</label>
                                <div>
                                    <ToggleSwitch
                                        ref={node => {
                                            this.fields.enabled = node;
                                        }}
                                        size="sm"
                                        checked={enabled}
                                    />
                                </div>
                            </FormGroup>
                            <FormGroup>
                                <label>{i18n._('Name')}</label>
                                <Input
                                    type="text"
                                    name="name"
                                    value={name}
                                    className={classNames(
                                        'form-control',
                                    )}
                                    validations={[validations.required]}
                                />
                            </FormGroup>
                        </SectionGroup>
                        <SectionGroup style={{ marginBottom: 0 }}>
                            <SectionTitle>{i18n._('Machine Position')}</SectionTitle>
                            <Margin left={24}>
                                <FlexContainer fluid gutterWidth={0}>
                                    <Row>
                                        <Col>
                                            <FormGroup>
                                                <label><Axis value="X" sub="min" /></label>
                                                <input
                                                    type="number"
                                                    name="xmin"
                                                    defaultValue={String(xmin)}
                                                    className={classNames(
                                                        'form-control',
                                                    )}
                                                />
                                            </FormGroup>
                                        </Col>
                                        <Col width="auto" style={{ width: 16 }} />
                                        <Col>
                                            <FormGroup>
                                                <label><Axis value="X" sub="max" /></label>
                                                <input
                                                    type="number"
                                                    name="xmax"
                                                    defaultValue={String(xmax)}
                                                    className={classNames(
                                                        'form-control',
                                                    )}
                                                />
                                            </FormGroup>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col>
                                            <FormGroup>
                                                <label><Axis value="Y" sub="min" /></label>
                                                <input
                                                    type="number"
                                                    name="ymin"
                                                    defaultValue={String(ymin)}
                                                    className={classNames(
                                                        'form-control',
                                                    )}
                                                />
                                            </FormGroup>
                                        </Col>
                                        <Col width="auto" style={{ width: 16 }} />
                                        <Col>
                                            <FormGroup>
                                                <label><Axis value="Y" sub="max" /></label>
                                                <input
                                                    type="number"
                                                    name="ymax"
                                                    defaultValue={String(ymax)}
                                                    className={classNames(
                                                        'form-control',
                                                    )}
                                                />
                                            </FormGroup>
                                        </Col>
                                    </Row>
                                    <Row>
                                        <Col>
                                            <FormGroup>
                                                <label><Axis value="Z" sub="min" /></label>
                                                <input
                                                    type="number"
                                                    name="zmin"
                                                    defaultValue={String(zmin)}
                                                    className={classNames(
                                                        'form-control',
                                                    )}
                                                />
                                            </FormGroup>
                                        </Col>
                                        <Col width="auto" style={{ width: 16 }} />
                                        <Col>
                                            <FormGroup>
                                                <label><Axis value="Z" sub="max" /></label>
                                                <input
                                                    type="number"
                                                    name="zmax"
                                                    defaultValue={String(zmax)}
                                                    className={classNames(
                                                        'form-control',
                                                    )}
                                                />
                                            </FormGroup>
                                        </Col>
                                    </Row>
                                </FlexContainer>
                            </Margin>
                        </SectionGroup>
                    </Form>
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
                            this.form.validate(err => {
                                if (err) {
                                    return;
                                }

                                const { enabled, name, xmin, xmax, ymin, ymax, zmin, zmax } = this.value;
                                actions.createRecord({
                                    enabled,
                                    name,
                                    xmin: Number(xmin) || 0,
                                    xmax: Number(xmax) || 0,
                                    ymin: Number(ymin) || 0,
                                    ymax: Number(ymax) || 0,
                                    zmin: Number(zmin) || 0,
                                    zmax: Number(zmax) || 0,
                                });
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

export default CreateRecord;
