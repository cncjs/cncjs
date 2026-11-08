import { ensureFiniteNumber } from 'ensure-type';
import _get from 'lodash/get';
import { differenceInSeconds, format } from 'date-fns';
import React from 'react';
import { connect } from 'react-redux';
import {
  Box,
  Flex,
  LinearProgress,
  Text,
  TextLabel,
} from '@tonic-ui/react';
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

export const formatISODateTime = (time) => {
  return time > 0 ? format(time, 'yyyy-MM-dd HH:mm:ss') : '–';
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

const Stat = ({ label, value }) => (
  <Box flex="1" mb="2x">
    <TextLabel mb="1x">{i18n._(label)}</TextLabel>
    <Text>{value}</Text>
  </Box>
);

const DimensionRow = ({ axis, min, max, dimension }) => (
  <Flex>
    <Box width="15%"><Text>{i18n._(axis)}</Text></Box>
    <Box width="28%"><Text>{min}</Text></Box>
    <Box width="28%"><Text>{max}</Text></Box>
    <Box width="29%"><Text>{dimension}</Text></Box>
  </Flex>
);

function GCodeStats({
  units,
  boundingBox,
  loaded,
  name,
  size,
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
  const hasLoadedGCode = Boolean(loaded && total > 0);

  if (!hasLoadedGCode) {
    return (
      <Box className="gcode-stats">
        <Text role="status">{i18n._('G-code not loaded')}</Text>
      </Box>
    );
  }

  // Received, not sent. Sent counts lines handed to the controller, which
  // runs several seconds behind while its planner buffer drains, so a bar
  // driven by it reads ahead of the tool and reaches 100% with the job
  // still cutting. Received counts lines the controller acknowledged.
  const progress = Math.min(100, Math.round((received / total) * 100));

  return (
    <Box className="gcode-stats">
      <Flex wrap="wrap">
        <Stat label="File" value={name} />
        <Stat label="Size" value={`${size} ${i18n._('bytes')}`} />
        <Stat label="Lines" value={total} />
      </Flex>

      <Box mb="4x">
        <Flex>
          <Box width="15%"><TextLabel>{i18n._('Axis')}</TextLabel></Box>
          <Box width="28%"><TextLabel>{i18n._('Min')}</TextLabel></Box>
          <Box width="28%"><TextLabel>{i18n._('Max')}</TextLabel></Box>
          <Box width="29%"><TextLabel>{i18n._('Dimension')}</TextLabel></Box>
        </Flex>
        <DimensionRow
          axis="X"
          min={`${mapPositionToUnits(minX, units)} ${displayUnits}`}
          max={`${mapPositionToUnits(maxX, units)} ${displayUnits}`}
          dimension={`${mapPositionToUnits(dX, units)} ${displayUnits}`}
        />
        <DimensionRow
          axis="Y"
          min={`${mapPositionToUnits(minY, units)} ${displayUnits}`}
          max={`${mapPositionToUnits(maxY, units)} ${displayUnits}`}
          dimension={`${mapPositionToUnits(dY, units)} ${displayUnits}`}
        />
        <DimensionRow
          axis="Z"
          min={`${mapPositionToUnits(minZ, units)} ${displayUnits}`}
          max={`${mapPositionToUnits(maxZ, units)} ${displayUnits}`}
          dimension={`${mapPositionToUnits(dZ, units)} ${displayUnits}`}
        />
      </Box>

      <Box mb="4x">
        <LinearProgress
          aria-label={i18n._('G-code progress')}
          variant="determinate"
          min={0}
          max={total}
          value={received}
        />
        <Text>{progress}%</Text>
      </Box>

      <Flex>
        <Stat label="Sent" value={`${sent} / ${total}`} />
        <Stat label="Received" value={`${received} / ${total}`} />
      </Flex>
      <Flex>
        <Stat label="Start Time" value={formatISODateTime(startTime)} />
        <Stat label="Elapsed Time" value={formatElapsedTime(elapsedTime)} />
      </Flex>
      <Flex>
        <Stat label="Finish Time" value={formatISODateTime(finishTime)} />
        <Stat label="Remaining Time" value={formatRemainingTime(remainingTime)} />
      </Flex>
    </Box>
  );
}

export default connect(store => {
  const modalUnits = _get(store, 'controller.modal.units');
  const units = {
    'G20': IMPERIAL_UNITS,
    'G21': METRIC_UNITS,
  }[modalUnits];
  const boundingBox = _get(store, 'controller.boundingBox');
  const senderStatus = _get(store, 'controller.sender.status') || {};

  return {
    units,
    boundingBox,
    loaded: _get(senderStatus, 'loaded'),
    name: _get(senderStatus, 'name'),
    size: _get(senderStatus, 'size'),
    total: _get(senderStatus, 'total'),
    sent: _get(senderStatus, 'sent'),
    received: _get(senderStatus, 'received'),
    startTime: _get(senderStatus, 'startTime'),
    finishTime: _get(senderStatus, 'finishTime'),
    elapsedTime: _get(senderStatus, 'elapsedTime'),
    remainingTime: _get(senderStatus, 'remainingTime'),
  };
})(GCodeStats);
