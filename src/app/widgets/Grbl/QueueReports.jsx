import {
  Box,
  LinearProgress,
  Text,
} from '@tonic-ui/react';
import _get from 'lodash/get';
import React, { useRef } from 'react';
import { connect } from 'react-redux';
import i18n from '@app/lib/i18n';
import { ensurePositiveNumber } from 'ensure-type';
import useWidgetConfig from '@app/widgets/shared/useWidgetConfig';
import OverflowEllipsis from './components/OverflowEllipsis';
import ReportSection from './components/ReportSection';

const mapReceiveBufferSizeToColor = (rx) => {
  // danger: 0-7
  // warning: 8-15
  // info: >=16
  rx = ensurePositiveNumber(rx);
  if (rx >= 16) {
    return 'info.icon';
  }
  if (rx >= 8) {
    return 'warning.icon';
  }
  return 'error.icon';
};

// Hook
const usePlannerBufferMax = (plannerBufferSize) => {
  const ref = useRef(0);

  let plannerBufferMax = ref.current;
  const nextPlannerBufferMax = Math.max(plannerBufferMax, plannerBufferSize) || plannerBufferMax;
  if (nextPlannerBufferMax > plannerBufferMax) {
    plannerBufferMax = nextPlannerBufferMax;
  }
  ref.current = plannerBufferMax;

  return plannerBufferMax;
};

// Hook
const useReceiveBufferMax = (receiveBufferSize) => {
  const ref = useRef(128);

  let receiveBufferMax = ref.current;
  const nextReceiveBufferMax = Math.max(receiveBufferMax, receiveBufferSize) || receiveBufferMax;
  if (nextReceiveBufferMax > receiveBufferMax) {
    receiveBufferMax = nextReceiveBufferMax;
  }
  ref.current = receiveBufferMax;

  return receiveBufferMax;
};

/**
 * @param {{ plannerBufferSize?: number, receiveBufferSize?: number }} props
 */
function QueueReports({
  plannerBufferSize = 0,
  receiveBufferSize = 0,
}) {
  const config = useWidgetConfig();
  const expanded = config.get('panel.queueReports.expanded');

  // https://github.com/grbl/grbl/wiki/Interfacing-with-Grbl
  // Grbl v0.9: BLOCK_BUFFER_SIZE (18), RX_BUFFER_SIZE (128)
  // Grbl v1.1: BLOCK_BUFFER_SIZE (16), RX_BUFFER_SIZE (128)
  const plannerBufferMin = 0;
  const receiveBufferMin = 0;
  const plannerBufferMax = usePlannerBufferMax(plannerBufferSize);
  const receiveBufferMax = useReceiveBufferMax(receiveBufferSize);

  if (!plannerBufferSize && !receiveBufferSize) {
    return null;
  }

  return (
    <ReportSection
      isExpanded={Boolean(expanded)}
      title={i18n._('Queue Reports')}
      onToggle={({ isExpanded }) => config.set('panel.queueReports.expanded', isExpanded)}
    >
      <Box p="3x">
        <BufferRow
          label={i18n._('Planner Buffer')}
          max={plannerBufferMax}
          min={plannerBufferMin}
          value={plannerBufferSize}
        />
        <BufferRow
          color={mapReceiveBufferSizeToColor(receiveBufferSize)}
          label={i18n._('Receive Buffer')}
          max={receiveBufferMax}
          min={receiveBufferMin}
          value={receiveBufferSize}
        />
      </Box>
    </ReportSection>
  );
}

/**
 * @param {{ color?: string, label: string, max: number, min: number, value: number }} props
 */
function BufferRow({ color, label, max, min, value }) {
  return (
    <Box alignItems="center" display="flex" mb="2x">
      <Box width="50%"><OverflowEllipsis title={label}>{label}</OverflowEllipsis></Box>
      <Box width="50%">
        <LinearProgress
          aria-label={label}
          color={color}
          max={max}
          min={min}
          value={value}
          variant="determinate"
        />
        <Text>{value}</Text>
      </Box>
    </Box>
  );
}

export default connect(store => {
  const controllerState = _get(store, 'controller.state');
  const plannerBufferSize = ensurePositiveNumber(_get(controllerState, 'status.buf.planner'));
  const receiveBufferSize = ensurePositiveNumber(_get(controllerState, 'status.buf.rx'));

  return {
    plannerBufferSize,
    receiveBufferSize,
  };
})(QueueReports);
