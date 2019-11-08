import _get from 'lodash/get';
import _mapValues from 'lodash/mapValues';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { Container, Row, Col } from 'app/components/GridSystem';
import HorizontalForm from 'app/components/HorizontalForm';
import i18n from 'app/lib/i18n';
import { mapPositionToUnits } from 'app/lib/units';
import {
    IMPERIAL_UNITS,
    METRIC_UNITS
} from 'app/constants';

const formatISODateTime = (time) => {
    return time > 0 ? moment.unix(time / 1000).format('YYYY-MM-DD HH:mm:ss') : '–';
};

const formatElapsedTime = (elapsedTime) => {
    if (!elapsedTime || elapsedTime < 0) {
        return '–';
    }
    const d = moment.duration(elapsedTime, 'ms');
    return moment(d._data).format('HH:mm:ss');
};

const formatRemainingTime = (remainingTime) => {
    if (!remainingTime || remainingTime < 0) {
        return '–';
    }
    const d = moment.duration(remainingTime, 'ms');
    return moment(d._data).format('HH:mm:ss');
};

const GCodeStats = ({
    units,
    total,
    sent,
    received,
    bbox,
    startTime,
    finishTime,
    elapsedTime,
    remainingTime,
}) => {
    const displayUnits = (units === METRIC_UNITS) ? i18n._('mm') : i18n._('in');
    bbox = _mapValues(bbox, (position) => {
        return _mapValues(position, (pos, axis) => {
            return mapPositionToUnits(pos, units);
        });
    });

    return (
        <Container fluid>
            <HorizontalForm spacing={['.75rem', '.5rem']}>
                {({ FormContainer, FormRow, FormCol }) => (
                    <FormContainer style={{ width: '100%' }}>
                        <FormRow>
                            <FormCol style={{ width: '1%' }}>
                                {i18n._('Axis')}
                            </FormCol>
                            <FormCol>
                                {i18n._('Min')}
                            </FormCol>
                            <FormCol>
                                {i18n._('Max')}
                            </FormCol>
                            <FormCol>
                                {i18n._('Dimension')}
                            </FormCol>
                        </FormRow>
                        <FormRow>
                            <FormCol>
                                X
                            </FormCol>
                            <FormCol>
                                {bbox.min.x} {displayUnits}
                            </FormCol>
                            <FormCol>
                                {bbox.max.x} {displayUnits}
                            </FormCol>
                            <FormCol>
                                {bbox.delta.x} {displayUnits}
                            </FormCol>
                        </FormRow>
                        <FormRow>
                            <FormCol>
                                Y
                            </FormCol>
                            <FormCol>
                                {bbox.min.y} {displayUnits}
                            </FormCol>
                            <FormCol>
                                {bbox.max.y} {displayUnits}
                            </FormCol>
                            <FormCol>
                                {bbox.delta.y} {displayUnits}
                            </FormCol>
                        </FormRow>
                        <FormRow>
                            <FormCol>
                                Z
                            </FormCol>
                            <FormCol>
                                {bbox.min.z} {displayUnits}
                            </FormCol>
                            <FormCol>
                                {bbox.max.z} {displayUnits}
                            </FormCol>
                            <FormCol>
                                {bbox.delta.z} {displayUnits}
                            </FormCol>
                        </FormRow>
                    </FormContainer>
                )}
            </HorizontalForm>
            <Row>
                <Col>
                    <div>{i18n._('Sent')}</div>
                    <div>{total > 0 ? `${sent} / ${total}` : '–'}</div>
                </Col>
                <Col>
                    <div>{i18n._('Received')}</div>
                    <div>{total > 0 ? `${received} / ${total}` : '–'}</div>
                </Col>
            </Row>
            <Row>
                <Col>
                    <div>{i18n._('Start Time')}</div>
                    <div>{formatISODateTime(startTime)}</div>
                </Col>
                <Col>
                    <div>{i18n._('Elapsed Time')}</div>
                    <div>{formatElapsedTime(elapsedTime)}</div>
                </Col>
            </Row>
            <Row>
                <Col>
                    <div>{i18n._('Finish Time')}</div>
                    <div>{formatISODateTime(finishTime)}</div>
                </Col>
                <Col>
                    <div>{i18n._('Remaining Time')}</div>
                    <div>{formatRemainingTime(remainingTime)}</div>
                </Col>
            </Row>
        </Container>
    );
};

export default connect(store => {
    const modalUnits = _get(store, 'controller.modal.units');
    const units = {
        'G20': IMPERIAL_UNITS,
        'G21': METRIC_UNITS,
    }[modalUnits];

    return {
        units,
    };
})(GCodeStats);
