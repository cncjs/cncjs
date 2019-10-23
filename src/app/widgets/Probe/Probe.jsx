import _get from 'lodash/get';
import _includes from 'lodash/includes';
import _trim from 'lodash/trim';
import React, { useRef } from 'react';
import { Form, Field, FormSpy } from 'react-final-form';
import { connect } from 'react-redux';
import { Button, ButtonGroup } from 'app/components/Buttons';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import Input from 'app/components/FormControl/Input';
import FormGroup from 'app/components/FormGroup';
import Hoverable from 'app/components/Hoverable';
import InputGroup from 'app/components/InputGroup';
import Label from 'app/components/Label';
import Margin from 'app/components/Margin';
import Space from 'app/components/Space';
import Infotip from 'app/components/Infotip';
import {
    IMPERIAL_UNITS,
    METRIC_UNITS,
} from 'app/constants';
import {
    CONNECTION_STATE_CONNECTED,
} from 'app/constants/connection';
import {
    MACHINE_STATE_NONE,
    REFORMED_MACHINE_STATE_IDLE,
} from 'app/constants/controller';
import {
    WORKFLOW_STATE_IDLE,
} from 'app/constants/workflow';
import useToggle from 'app/hooks/useToggle';
import { ensurePositiveNumber } from 'app/lib/ensure-type';
import i18n from 'app/lib/i18n';
import { in2mm, mapValueToUnits } from 'app/lib/units';
import useWidgetConfig from 'app/widgets/shared/useWidgetConfig';
import ProbeModal from './modals/ProbeModal';

const mapProbeCommandToDescription = (probeCommand) => ({
    'G38.2': i18n._('G38.2 probe toward workpiece, stop on contact, signal error if failure'),
    'G38.3': i18n._('G38.3 probe toward workpiece, stop on contact'),
    'G38.4': i18n._('G38.4 probe away from workpiece, stop on loss of contact, signal error if failure'),
    'G38.5': i18n._('G38.5 probe away from workpiece, stop on loss of contact'),
}[probeCommand] || '');

const Probe = ({
    isActionable,
    units,
    wcs,
}) => {
    const probeDataRef = useRef(null);
    const [modalState, toggleModalState] = useToggle(false);
    const config = useWidgetConfig();
    const initialValues = {
        probeAxis: config.get('probeAxis', 'Z'),
        probeCommand: config.get('probeCommand', 'G38.2'),
        probeDepth: mapValueToUnits(config.get('probeDepth'), units),
        probeFeedrate: mapValueToUnits(config.get('probeFeedrate'), units),
        touchPlateHeight: mapValueToUnits(config.get('touchPlateHeight'), units),
        retractionDistance: mapValueToUnits(config.get('retractionDistance'), units),
    };
    const displayUnits = (units === METRIC_UNITS) ? i18n._('mm') : i18n._('in');
    const feedrateUnits = (units === METRIC_UNITS) ? i18n._('mm/min') : i18n._('in/min');
    const step = (units === METRIC_UNITS) ? 1 : 0.1;

    return (
        <>
            {modalState && (
                <ProbeModal
                    onClose={() => {
                        toggleModalState(false);
                    }}
                    probeData={probeDataRef.current}
                />
            )}
            <Form
                initialValues={initialValues}
                onSubmit={(values) => {
                    const {
                        probeAxis,
                        probeCommand,
                        probeDepth,
                        probeFeedrate,
                        touchPlateHeight,
                        retractionDistance,
                    } = values;

                    probeDataRef.current = {
                        probeAxis,
                        probeCommand,
                        probeDepth,
                        probeFeedrate,
                        touchPlateHeight,
                        retractionDistance,
                        wcs,
                    };

                    toggleModalState(true);
                }}
                subscription={{}}
                validate={values => {
                    const errors = {};
                    if (values.probeDepth === undefined) {
                        errors.probeDepth = i18n._('Required field.');
                    }
                    if (values.probeFeedrate === undefined) {
                        errors.probeFeedrate = i18n._('Required field.');
                    }
                    if (values.touchPlateHeight === undefined) {
                        errors.touchPlateHeight = i18n._('Required field.');
                    }
                    if (values.retractionDistance === undefined) {
                        errors.retractionDistance = i18n._('Required field.');
                    }
                    return errors;
                }}
            >
                {({ form }) => (
                    <>
                        <Field name="probeAxis">
                            {({ input, meta }) => {
                                const changeValueByProbeAxis = (probeAxis) => (event) => {
                                    config.set('probeAxis', probeAxis);
                                    input.onChange(probeAxis);
                                };
                                const probeAxis = input.value;

                                return (
                                    <FormGroup>
                                        <Margin bottom=".25rem">
                                            <div>
                                                <Label>{i18n._('Probe Axis')}</Label>
                                            </div>
                                            <ButtonGroup
                                                sm
                                                style={{
                                                    minWidth: '50%',
                                                }}
                                            >
                                                <Button
                                                    btnStyle={probeAxis === 'Z' ? 'dark' : 'default'}
                                                    title={i18n._('Probe Z axis')}
                                                    onClick={changeValueByProbeAxis('Z')}
                                                >
                                                    Z
                                                </Button>
                                                <Button
                                                    btnStyle={probeAxis === 'X' ? 'dark' : 'default'}
                                                    title={i18n._('Probe X axis')}
                                                    onClick={changeValueByProbeAxis('X')}
                                                >
                                                    X
                                                </Button>
                                                <Button
                                                    btnStyle={probeAxis === 'Y' ? 'dark' : 'default'}
                                                    title={i18n._('Probe Y axis')}
                                                    onClick={changeValueByProbeAxis('Y')}
                                                >
                                                    Y
                                                </Button>
                                            </ButtonGroup>
                                        </Margin>
                                    </FormGroup>
                                );
                            }}
                        </Field>
                        <Field name="probeCommand">
                            {({ input, meta }) => {
                                const changeValueByProbeCommand = (probeCommand) => (event) => {
                                    config.set('probeCommand', probeCommand);
                                    input.onChange(probeCommand);
                                };
                                const probeCommand = input.value;

                                return (
                                    <FormGroup>
                                        <Margin bottom=".25rem">
                                            <div>
                                                <Label>{i18n._('Probe Command: {{probeCommand}}', { probeCommand })}</Label>
                                                <Space width={8} />
                                                <Infotip content={mapProbeCommandToDescription(probeCommand)}>
                                                    <Hoverable>
                                                        {({ hovered }) => (
                                                            <span
                                                                className="fa-layers fa-fw"
                                                                style={{
                                                                    color: '#222',
                                                                    opacity: hovered ? 1 : 0.5,
                                                                }}
                                                            >
                                                                <FontAwesomeIcon icon={['far', 'circle']} />
                                                                <FontAwesomeIcon icon="info" transform="shrink-8" />
                                                            </span>
                                                        )}
                                                    </Hoverable>
                                                </Infotip>
                                            </div>
                                            <ButtonGroup
                                                sm
                                                style={{
                                                    minWidth: '80%',
                                                }}
                                            >
                                                <Button
                                                    btnStyle={probeCommand === 'G38.2' ? 'dark' : 'default'}
                                                    title={mapProbeCommandToDescription('G38.2')}
                                                    onClick={changeValueByProbeCommand('G38.2')}
                                                >
                                                    G38.2
                                                </Button>
                                                <Button
                                                    btnStyle={probeCommand === 'G38.3' ? 'dark' : 'default'}
                                                    title={mapProbeCommandToDescription('G38.3')}
                                                    onClick={changeValueByProbeCommand('G38.3')}
                                                >
                                                    G38.3
                                                </Button>
                                                <Button
                                                    btnStyle={probeCommand === 'G38.4' ? 'dark' : 'default'}
                                                    title={mapProbeCommandToDescription('G38.4')}
                                                    onClick={changeValueByProbeCommand('G38.4')}
                                                >
                                                    G38.4
                                                </Button>
                                                <Button
                                                    btnStyle={probeCommand === 'G38.5' ? 'dark' : 'default'}
                                                    title={mapProbeCommandToDescription('G38.5')}
                                                    onClick={changeValueByProbeCommand('G38.5')}
                                                >
                                                    G38.5
                                                </Button>
                                            </ButtonGroup>
                                        </Margin>
                                    </FormGroup>
                                );
                            }}
                        </Field>
                        <Field name="probeDepth">
                            {({ input, meta }) => {
                                const changeValue = (event) => {
                                    const value = _trim(event.target.value);
                                    if (value === '') { // empty string
                                        input.onChange(undefined);
                                        return;
                                    }

                                    const probeDepth = ensurePositiveNumber(units === IMPERIAL_UNITS ? in2mm(value) : value); // in mm
                                    config.set('probeDepth', probeDepth);
                                    input.onChange(probeDepth);
                                };

                                return (
                                    <FormGroup>
                                        <Label>{i18n._('Probe Depth')}</Label>
                                        <InputGroup sm>
                                            <Input
                                                type="number"
                                                value={input.value}
                                                min={0}
                                                step={step}
                                                onChange={changeValue}
                                            />
                                            <InputGroup.Append>
                                                <InputGroup.Text>
                                                    {displayUnits}
                                                </InputGroup.Text>
                                            </InputGroup.Append>
                                        </InputGroup>
                                        {meta.error && meta.touched && <span>{meta.error}</span>}
                                    </FormGroup>
                                );
                            }}
                        </Field>
                        <Field name="probeFeedrate">
                            {({ input, meta }) => {
                                const changeValue = (event) => {
                                    const value = _trim(event.target.value);
                                    if (value === '') { // empty string
                                        input.onChange(undefined);
                                        return;
                                    }

                                    const probeFeedrate = ensurePositiveNumber(units === IMPERIAL_UNITS ? in2mm(value) : value); // in mm
                                    config.set('probeFeedrate', probeFeedrate);
                                    input.onChange(probeFeedrate);
                                };

                                return (
                                    <FormGroup>
                                        <Label>{i18n._('Probe Feedrate')}</Label>
                                        <InputGroup sm>
                                            <Input
                                                type="number"
                                                value={input.value}
                                                min={0}
                                                step={step}
                                                onChange={changeValue}
                                            />
                                            <InputGroup.Append>
                                                <InputGroup.Text>
                                                    {feedrateUnits}
                                                </InputGroup.Text>
                                            </InputGroup.Append>
                                        </InputGroup>
                                        {meta.error && meta.touched && <span>{meta.error}</span>}
                                    </FormGroup>
                                );
                            }}
                        </Field>
                        <Field name="touchPlateHeight">
                            {({ input, meta }) => {
                                const changeValue = (event) => {
                                    const value = _trim(event.target.value);
                                    if (value === '') { // empty string
                                        input.onChange(undefined);
                                        return;
                                    }

                                    const touchPlateHeight = ensurePositiveNumber(units === IMPERIAL_UNITS ? in2mm(value) : value); // in mm
                                    config.set('touchPlateHeight', touchPlateHeight);
                                    input.onChange(touchPlateHeight);
                                };

                                return (
                                    <FormGroup>
                                        <Label>{i18n._('Touch Plate Thickness')}</Label>
                                        <InputGroup sm>
                                            <Input
                                                type="number"
                                                value={input.value}
                                                min={0}
                                                step={step}
                                                onChange={changeValue}
                                            />
                                            <InputGroup.Append>
                                                <InputGroup.Text>
                                                    {displayUnits}
                                                </InputGroup.Text>
                                            </InputGroup.Append>
                                        </InputGroup>
                                        {meta.error && meta.touched && <span>{meta.error}</span>}
                                    </FormGroup>
                                );
                            }}
                        </Field>
                        <Field name="retractionDistance">
                            {({ input, meta }) => {
                                const changeValue = (event) => {
                                    const value = _trim(event.target.value);
                                    if (value === '') { // empty string
                                        input.onChange(undefined);
                                        return;
                                    }

                                    const retractionDistance = ensurePositiveNumber(units === IMPERIAL_UNITS ? in2mm(value) : value); // in mm
                                    config.set('retractionDistance', retractionDistance);
                                    input.onChange(retractionDistance);
                                };

                                return (
                                    <FormGroup>
                                        <Label>{i18n._('Retraction Distance')}</Label>
                                        <InputGroup sm>
                                            <Input
                                                type="number"
                                                value={input.value}
                                                min={0}
                                                step={step}
                                                onChange={changeValue}
                                            />
                                            <InputGroup.Append>
                                                <InputGroup.Text>
                                                    {displayUnits}
                                                </InputGroup.Text>
                                            </InputGroup.Append>
                                        </InputGroup>
                                        {meta.error && meta.touched && <span>{meta.error}</span>}
                                    </FormGroup>
                                );
                            }}
                        </Field>
                        <FormSpy
                            subscription={{
                                values: true,
                                invalid: true,
                            }}
                        >
                            {({ values, invalid }) => {
                                const probeAxis = _get(values, 'probeAxis');
                                const canProbe = (() => {
                                    if (!isActionable) {
                                        return false;
                                    }

                                    if (invalid) {
                                        return false;
                                    }

                                    return true;
                                })();

                                return (
                                    <Margin bottom=".5rem">
                                        <Button
                                            md
                                            btnStyle="secondary"
                                            disabled={!canProbe}
                                            onClick={() => {
                                                form.submit();
                                            }}
                                        >
                                            {i18n._('Probe Axis {{axis}}', { axis: probeAxis })}
                                        </Button>
                                    </Margin>
                                );
                            }}
                        </FormSpy>
                    </>
                )}
            </Form>
        </>
    );
};

export default connect(store => {
    const isActionable = (() => {
        const connectionState = _get(store, 'connection.state');
        const isConnected = (connectionState === CONNECTION_STATE_CONNECTED);
        if (!isConnected) {
            return false;
        }

        const workflowState = _get(store, 'workflow.state');
        const isWorkflowIdle = (workflowState === WORKFLOW_STATE_IDLE);
        if (!isWorkflowIdle) {
            return false;
        }

        const reformedMachineState = _get(store, 'controller.reformedMachineState');
        const expectedStates = [
            MACHINE_STATE_NONE, // No machine state reported (e.g. Marlin).
            REFORMED_MACHINE_STATE_IDLE,
        ];
        const isExpectedState = _includes(expectedStates, reformedMachineState);
        return isExpectedState;
    })();
    const modalUnits = _get(store, 'controller.modal.units');
    const units = {
        'G20': IMPERIAL_UNITS,
        'G21': METRIC_UNITS,
    }[modalUnits];
    const wcs = _get(store, 'controller.modal.wcs') || 'G54';

    return {
        isActionable,
        units,
        wcs,
    };
})(Probe);
