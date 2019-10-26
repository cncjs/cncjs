import React, { useRef } from 'react';
import { Form, Field } from 'react-final-form';
import { Button, ButtonGroup } from 'app/components/Buttons';
import FormGroup from 'app/components/FormGroup';
import Modal from 'app/components/Modal';
import PrismCode from 'app/components/PrismCode';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import useWidgetConfig from 'app/widgets/shared/useWidgetConfig';
import {
    populateTLOProbeCommands,
    populateWCSProbeCommands,
} from './utils';

const PROBE_SETTER_TLO = 'tlo';
const PROBE_SETTER_WCS = 'wcs';

const ProbeModal = ({
    onClose,
    probeData,
}) => {
    const config = useWidgetConfig();
    const contentRef = useRef();
    const {
        probeAxis,
        probeCommand,
        probeDepth,
        probeFeedrate,
        touchPlateHeight,
        retractionDistance,
        wcs,
    } = probeData;
    const initialValues = {
        probeSetter: !!config.get('useTLO') ? PROBE_SETTER_TLO : PROBE_SETTER_WCS,
    };

    return (
        <Modal onClose={onClose}>
            <Form
                initialValues={initialValues}
                onSubmit={(values) => {
                    const content = contentRef.current;
                    controller.command('gcode', content);
                    onClose();
                }}
                subscription={{}}
            >
                {({ form }) => (
                    <>
                        <Modal.Header>
                            <Modal.Title>{i18n._('Probe')}</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <Field name="probeSetter">
                                {({ input }) => {
                                    const handleClickTLO = (event) => {
                                        input.onChange(PROBE_SETTER_TLO);

                                        config.set('useTLO', true);
                                    };
                                    const handleClickWCS = (event) => {
                                        input.onChange(PROBE_SETTER_WCS);

                                        config.set('useTLO', false);
                                    };
                                    const probeSetter = input.value;

                                    let probeCommands = [];
                                    if (probeSetter === PROBE_SETTER_TLO) {
                                        probeCommands = populateTLOProbeCommands({
                                            probeAxis,
                                            probeCommand,
                                            probeDepth,
                                            probeFeedrate,
                                            touchPlateHeight,
                                            retractionDistance,
                                        });
                                    } else if (probeSetter === PROBE_SETTER_WCS) {
                                        probeCommands = populateWCSProbeCommands({
                                            probeAxis,
                                            probeCommand,
                                            probeDepth,
                                            probeFeedrate,
                                            touchPlateHeight,
                                            retractionDistance,
                                            wcs,
                                        });
                                    }

                                    const content = probeCommands.join('\n');
                                    contentRef.current = content;

                                    return (
                                        <>
                                            <FormGroup>
                                                <ButtonGroup
                                                    sm
                                                    style={{
                                                        minWidth: '50%',
                                                    }}
                                                >
                                                    <Button
                                                        btnStyle={probeSetter === PROBE_SETTER_TLO ? 'dark' : 'default'}
                                                        onClick={handleClickTLO}
                                                    >
                                                        {i18n._('Tool Length Offset')}
                                                    </Button>
                                                    <Button
                                                        btnStyle={probeSetter === PROBE_SETTER_WCS ? 'dark' : 'default'}
                                                        onClick={handleClickWCS}
                                                    >
                                                        {i18n._('Work Coordinate System')}
                                                    </Button>
                                                </ButtonGroup>
                                            </FormGroup>
                                            <PrismCode
                                                content={content}
                                                language="gcode"
                                                style={{
                                                    padding: '.5rem .75rem',
                                                }}
                                            />
                                        </>
                                    );
                                }}
                            </Field>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button
                                btnStyle="default"
                                onClick={onClose}
                            >
                                {i18n._('Cancel')}
                            </Button>
                            <Button
                                sm
                                btnStyle="primary"
                                onClick={() => form.submit()}
                            >
                                {i18n._('Run Probe')}
                            </Button>
                        </Modal.Footer>
                    </>
                )}
            </Form>
        </Modal>
    );
};

export default ProbeModal;
