import PropTypes from 'prop-types';
import React from 'react';
import i18n from 'app/lib/i18n';
import { toDisplayUnits } from 'app/lib/units';

// Fixed layout positions — no dynamic scaling
const SVG_WIDTH = 230;
const SVG_HEIGHT = 125;
const PROBE_X = 120;
const PROBE_WIDTH = 14;
const CLEARANCE_Y = 2;
const TOOL_TOP_Y = 18;
const TIP_Y = 52;
const WORKPIECE_TOP_Y = 68;
const WORKPIECE_BOTTOM_Y = 88;
const ARROW_END_Y = 115;

const ZProbeDiagram = ({ clearanceZ, startZ, endZ, feedrate, units, ...props }) => {
  const displayUnits = toDisplayUnits(units);
  return (
  <svg
    viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
    {...props}
  >
    {/* Workpiece block */}
    <rect
      x="5"
      y={WORKPIECE_TOP_Y}
      width="220"
      height={WORKPIECE_BOTTOM_Y - WORKPIECE_TOP_Y}
      fill="#e8d4a0"
      stroke="#b8a070"
      strokeWidth="1"
    />

    {/* Workpiece label */}
    <text
      x={12}
      y={(WORKPIECE_TOP_Y + WORKPIECE_BOTTOM_Y) / 2}
      textAnchor="start"
      dominantBaseline="central"
      fontSize="9"
      fill="#8a7040"
    >
      {i18n._('Workpiece')}
    </text>

    {/* Clearance Z line — above the tool */}
    <line
      x1="5"
      x2="225"
      y1={CLEARANCE_Y}
      y2={CLEARANCE_Y}
      stroke="#339933"
      strokeWidth="1"
      strokeDasharray="3,2"
    />
    <text
      x={12}
      y={CLEARANCE_Y + 10}
      fontSize="9"
      fill="#339933"
    >
      {`${i18n._('Clearance Z')}: ${clearanceZ} ${displayUnits}`}
    </text>

    {/* Probe tool body */}
    <rect
      x={PROBE_X - PROBE_WIDTH / 2}
      y={TOOL_TOP_Y}
      width={PROBE_WIDTH}
      height={TIP_Y - TOOL_TOP_Y - 8}
      fill="#888"
      stroke="#555"
      strokeWidth="1"
    />

    {/* Probe tool tip (triangle) */}
    <polygon
      points={`${PROBE_X - PROBE_WIDTH / 2},${TIP_Y - 8} ${PROBE_X + PROBE_WIDTH / 2},${TIP_Y - 8} ${PROBE_X},${TIP_Y}`}
      fill="#888"
      stroke="#555"
      strokeWidth="1"
    />

    {/* Start Z label */}
    <text
      x={PROBE_X + 16}
      y={TIP_Y}
      fontSize="9"
      fill="#0066cc"
    >
      {`${i18n._('Start Z')}: ${startZ} ${displayUnits}`}
    </text>

    {/* Dashed probe path through workpiece */}
    <line
      x1={PROBE_X}
      y1={TIP_Y + 4}
      x2={PROBE_X}
      y2={ARROW_END_Y - 6}
      stroke="#cc0000"
      strokeWidth="1.5"
      strokeDasharray="4,3"
    />

    {/* Arrow tip */}
    <polygon
      points={`${PROBE_X},${ARROW_END_Y} ${PROBE_X - 4},${ARROW_END_Y - 8} ${PROBE_X + 4},${ARROW_END_Y - 8}`}
      fill="#cc0000"
    />

    {/* End Z label */}
    <text
      x={PROBE_X + 16}
      y={ARROW_END_Y + 2}
      fontSize="9"
      fill="#cc0000"
    >
      {`${i18n._('End Z')}: ${endZ} ${displayUnits}`}
    </text>

    {/* Feedrate label on the left of the tool */}
    <text
      x={PROBE_X - PROBE_WIDTH / 2 - 6}
      y={TIP_Y - 8}
      textAnchor="end"
      fontSize="9"
      fill="#666"
    >
      {`${feedrate} ${displayUnits}/${i18n._('min')}`}
    </text>
  </svg>
  );
};

ZProbeDiagram.propTypes = {
  clearanceZ: PropTypes.number,
  startZ: PropTypes.number,
  endZ: PropTypes.number,
  feedrate: PropTypes.number,
  units: PropTypes.string,
};

export default ZProbeDiagram;
