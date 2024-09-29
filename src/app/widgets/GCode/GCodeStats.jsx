import { ensureFiniteNumber } from 'ensure-type';
import _get from 'lodash/get';
import { differenceInSeconds, format } from 'date-fns';
import React from 'react';
import { connect } from 'react-redux';
import FormGroup from '@app/components/FormGroup';
import { Container, Row, Col } from '@app/components/GridSystem';
import HorizontalForm from '@app/components/HorizontalForm';
import i18n from '@app/lib/i18n';
import { mapPositionToUnits } from '@app/lib/units';
import {
  IMPERIAL_UNITS,
  METRIC_UNITS
} from '@app/constants';

const formatDuration = (start, finish) => {
  const diffTime = differenceInSeconds(finish, start);
  if (!diffTime) {
    return '00:00:00'; // divide by 0 protection
  }
  const minutes = Math.abs(Math.floor(diffTime / 60) % 60).toString();
  const hours = Math.abs(Math.floor(diffTime / 60 / 60)).toString();
  const seconds = Math.abs(diffTime % 60).toString();
  return [
    hours.length < 2 ? 0 + hours : hours,
    minutes.length < 2 ? 0 + minutes : minutes,
    seconds.length < 2 ? 0 + seconds : seconds,
  ].join(':');
};

const formatISODateTime = (time) => {
  return time > 0 ? format(time / 1000, 'YYYY-MM-dd HH:mm:ss') : '–';
};

const formatElapsedTime = (elapsedTime) => {
  if (!elapsedTime || elapsedTime < 0) {
    return '–';
  }
  return formatDuration(0, elapsedTime); // ms
};

const formatRemainingTime = (remainingTime) => {
  if (!remainingTime || remainingTime < 0) {
    return '–';
  }
  return formatDuration(0, remainingTime);
};

function GCodeStats({
  units,
  boundingBox,
  loaded,
  total,
  sent,
  received,
  startTime,
  finishTime,
  elapsedTime,
  remainingTime,
}) {
  const displayUnits = (units === METRIC_UNITS) ? i18n._('mm') : i18n._('in');
  const minX = ensureFiniteNumber(_get(boundingBox, 'min.x'));
  const minY = ensureFiniteNumber(_get(boundingBox, 'min.y'));
  const minZ = ensureFiniteNumber(_get(boundingBox, 'min.z'));
  const maxX = ensureFiniteNumber(_get(boundingBox, 'max.x'));
  const maxY = ensureFiniteNumber(_get(boundingBox, 'max.y'));
  const maxZ = ensureFiniteNumber(_get(boundingBox, 'max.z'));
  const dX = maxX - minX;
  const dY = maxY - minY;
  const dZ = maxZ - minZ;

  return (
    <Container fluid>
      <FormGroup>
        <HorizontalForm
          spacing={['.75rem', '.5rem']}
        >
          {({ FormContainer, FormRow, FormCol }) => (
            <FormContainer>
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
                  {mapPositionToUnits(minX, units)} {displayUnits}
                </FormCol>
                <FormCol>
                  {mapPositionToUnits(maxX, units)} {displayUnits}
                </FormCol>
                <FormCol>
                  {mapPositionToUnits(dX, units)} {displayUnits}
                </FormCol>
              </FormRow>
              <FormRow>
                <FormCol>
                  Y
                </FormCol>
                <FormCol>
                  {mapPositionToUnits(minY)} {displayUnits}
                </FormCol>
                <FormCol>
                  {mapPositionToUnits(maxY)} {displayUnits}
                </FormCol>
                <FormCol>
                  {mapPositionToUnits(dY)} {displayUnits}
                </FormCol>
              </FormRow>
              <FormRow>
                <FormCol>
                  Z
                </FormCol>
                <FormCol>
                  {mapPositionToUnits(minZ)} {displayUnits}
                </FormCol>
                <FormCol>
                  {mapPositionToUnits(maxZ)} {displayUnits}
                </FormCol>
                <FormCol>
                  {mapPositionToUnits(dZ)} {displayUnits}
                </FormCol>
              </FormRow>
            </FormContainer>
          )}
        </HorizontalForm>
      </FormGroup>
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
}

export default connect(store => {
  const modalUnits = _get(store, 'controller.modal.units');
  const units = {
    'G20': IMPERIAL_UNITS,
    'G21': METRIC_UNITS,
  }[modalUnits];
  const boundingBox = _get(store, 'controller.boundingBox');
  const senderStatus = _get(store, 'controller.sender.status');
  const total = _get(senderStatus, 'total');
  const sent = _get(senderStatus, 'sent');
  const received = _get(senderStatus, 'received');
  const startTime = _get(senderStatus, 'startTime');
  const finishTime = _get(senderStatus, 'finishTime');
  const elapsedTime = _get(senderStatus, 'elapsedTime');
  const remainingTime = _get(senderStatus, 'remainingTime');

  return {
    units,
    boundingBox,
    total,
    sent,
    received,
    startTime,
    finishTime,
    elapsedTime,
    remainingTime,
  };
})(GCodeStats);
