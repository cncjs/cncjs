import PropTypes from 'prop-types';
import React from 'react';
import i18n from 'app/lib/i18n';
import { toDisplayUnits } from 'app/lib/units';

const SVG_WIDTH = 230;
const SVG_HEIGHT = 140;
const AREA_LEFT = 30;
const AREA_TOP = 10;
const AREA_WIDTH = 160;
const AREA_HEIGHT = 100;

const ProbeAreaDiagram = ({
  startX,
  startY,
  endX,
  endY,
  stepSize,
  units,
}) => {
  const displayUnits = toDisplayUnits(units);
  const width = endX - startX;
  const height = endY - startY;
  const numPointsX = Math.max(2, Math.floor(width / stepSize) + 1);
  const numPointsY = Math.max(2, Math.floor(height / stepSize) + 1);

  // Cap display grid to max ~20 per axis to avoid SVG clutter
  const maxPerAxis = 20;
  const displayX = Math.min(numPointsX, maxPerAxis);
  const displayY = Math.min(numPointsY, maxPerAxis);

  // Grid dot positions within the area
  const dots = [];
  for (let iy = 0; iy < displayY; iy++) {
    for (let ix = 0; ix < displayX; ix++) {
      dots.push({
        x: AREA_LEFT + (ix / (displayX - 1)) * AREA_WIDTH,
        y: AREA_TOP + (iy / (displayY - 1)) * AREA_HEIGHT,
      });
    }
  }

  // Scale dot size: smaller when more dots
  const dotRadius = Math.max(0.6, Math.min(2, 30 / Math.max(displayX, displayY)));

  return (
    <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}>
      {/* Probe area rectangle */}
      <rect
        x={AREA_LEFT}
        y={AREA_TOP}
        width={AREA_WIDTH}
        height={AREA_HEIGHT}
        fill="#f5f0e0"
        stroke="#b8a070"
        strokeWidth="1"
      />

      {/* Grid dots */}
      {dots.map((dot, idx) => (
        <circle
          key={idx}
          cx={dot.x}
          cy={dot.y}
          r={dotRadius}
          fill="#cc0000"
          opacity="0.5"
        />
      ))}

      {/* Start corner marker */}
      <circle
        cx={AREA_LEFT}
        cy={AREA_TOP + AREA_HEIGHT}
        r="4"
        fill="#0066cc"
        stroke="#fff"
        strokeWidth="1"
      />
      <text
        x={AREA_LEFT}
        y={AREA_TOP + AREA_HEIGHT + 12}
        textAnchor="middle"
        fontSize="8"
        fill="#0066cc"
      >
        {i18n._('START')}
      </text>

      {/* End corner marker */}
      <circle
        cx={AREA_LEFT + AREA_WIDTH}
        cy={AREA_TOP}
        r="4"
        fill="#cc0000"
        stroke="#fff"
        strokeWidth="1"
      />
      <text
        x={AREA_LEFT + AREA_WIDTH}
        y={AREA_TOP - 4}
        textAnchor="middle"
        fontSize="8"
        fill="#cc0000"
      >
        {i18n._('END')}
      </text>

      {/* Width dimension label (bottom) */}
      <text
        x={AREA_LEFT + AREA_WIDTH / 2}
        y={AREA_TOP + AREA_HEIGHT + 12}
        textAnchor="middle"
        fontSize="9"
        fill="#666"
      >
        {`${width} ${displayUnits}`}
      </text>

      {/* Height dimension label (right) */}
      <text
        x={AREA_LEFT + AREA_WIDTH + 8}
        y={AREA_TOP + AREA_HEIGHT / 2}
        textAnchor="start"
        dominantBaseline="central"
        fontSize="9"
        fill="#666"
      >
        {`${height} ${displayUnits}`}
      </text>
    </svg>
  );
};

ProbeAreaDiagram.propTypes = {
  startX: PropTypes.number,
  startY: PropTypes.number,
  endX: PropTypes.number,
  endY: PropTypes.number,
  stepSize: PropTypes.number,
  units: PropTypes.string,
};

export default ProbeAreaDiagram;
