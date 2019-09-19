import _get from 'lodash/get';
import _mapValues from 'lodash/mapValues';
import React from 'react';
import styled from 'styled-components';
import mapGCodeToText from 'app/lib/gcode-text';
import FormGroup from 'app/components/FormGroup';
import FeedOverride from './Overrides/FeedOverride';
import SpindleOverride from './Overrides/SpindleOverride';
import RapidOverride from './Overrides/RapidOverride';
import QueueReports from './Cards/QueueReports';
import StatusReports from './Cards/StatusReports';
import ModalGroups from './Cards/ModalGroups';

const Grbl = (props) => {
    const { state } = props;
    const controllerState = state.controller.state || {};

    // Override
    const ov = _get(controllerState, 'status.ov', []);
    const [ovF = 0, ovR = 0, ovS = 0] = ov;

    // Queue Reports
    const buf = _get(controllerState, 'status.buf', {});
    const plannerBufferSize = Number(_get(buf, 'planner')) || 0;
    const receiveBufferSize = Number(_get(buf, 'rx')) || 0;

    // Status Reports
    const parserState = _get(controllerState, 'parserstate', {});
    const activeState = _get(controllerState, 'status.activeState');
    const feedrate = _get(controllerState, 'status.feedrate', _get(parserState, 'feedrate'));
    const spindle = _get(controllerState, 'status.spindle', _get(parserState, 'spindle'));
    const tool = _get(parserState, 'tool');

    // Modal Groups
    const modal = _mapValues(parserState.modal || {}, mapGCodeToText);

    return (
        <>
            <FormGroup>
                {(ovF > 0) && (
                    <FeedOverride value={ovF} />
                )}
                {(ovS > 0) && (
                    <SpindleOverride value={ovS} />
                )}
                {(ovR > 0) && (
                    <RapidOverride value={ovR} />
                )}
            </FormGroup>
            <Accordion>
                <QueueReports
                    plannerBufferSize={plannerBufferSize}
                    receiveBufferSize={receiveBufferSize}
                />
                <StatusReports
                    activeState={activeState}
                    feedrate={feedrate}
                    spindle={spindle}
                    tool={tool}
                />
                <ModalGroups
                    modal={modal}
                />
            </Accordion>
        </>
    );
};

const Accordion = styled.div`
    > :not(:first-child) {
        border-top: 0;
    }
`;

export default Grbl;
