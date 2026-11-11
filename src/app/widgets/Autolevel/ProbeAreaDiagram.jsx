import PropTypes from 'prop-types';
import React from 'react';
import i18n from 'app/lib/i18n';
import { toDisplayUnits } from 'app/lib/units';
import { getScanPathEndpoints } from './scanPath';

const SVG_WIDTH = 230;
const SVG_HEIGHT = 140;
const AREA_LEFT = 30;
const AREA_TOP = 10;
const AREA_WIDTH = 160;
const AREA_HEIGHT = 100;
const MAX_POINTS_PER_AXIS = 20;
const LABEL_OFFSET = 11;

// Probe positions on one axis, matching the controller grid.
const createAxisPositions = (start, end, step) => {
  const count = Math.floor((end - start) / step + 1e-10) + 1;

  return Array.from({ length: count }, (_, index) => (
    Math.min(start + index * step, end)
  ));
};

// Thin out the dot grid for display, always keeping the last position.
const sampleAxisPositions = (positions) => {
  const stride = Math.ceil(positions.length / MAX_POINTS_PER_AXIS);
  const sampled = positions.filter((_, index) => index % stride === 0);

  if (sampled[sampled.length - 1] !== positions[positions.length - 1]) {
    sampled.push(positions[positions.length - 1]);
  }

  return sampled;
};

const ProbeAreaDiagram = ({
  startX,
  startY,
  endX,
  endY,
  stepX,
  stepY,
  scanPattern,
  scanDirection,
  units,
}) => {
  const displayUnits = toDisplayUnits(units);
  const width = endX - startX;
  const height = endY - startY;

  // Map a world position to the diagram. Both axes are scaled to the rectangle,
  // so a probe point stops where its axis really stops.
  const normalize = (value, start, span) => (span > 0 ? (value - start) / span : 0);
  const toSvgX = (x) => AREA_LEFT + normalize(x, startX, width) * AREA_WIDTH;
  const toSvgY = (y) => AREA_TOP + AREA_HEIGHT - normalize(y, startY, height) * AREA_HEIGHT;

  const displayX = sampleAxisPositions(createAxisPositions(startX, endX, stepX));
  const displayY = sampleAxisPositions(createAxisPositions(startY, endY, stepY));
  const dots = [];

  displayX.forEach((x) => {
    displayY.forEach((y) => {
      dots.push({ x: toSvgX(x), y: toSvgY(y) });
    });
  });

  // Scale dot size: smaller when more dots
  const dotRadius = Math.max(0.6, Math.min(2, 30 / Math.max(displayX.length, displayY.length)));

  // START and END are the first and last point of the probe path, which is not
  // the same pair of corners for every scan pattern.
  const { start, end } = getScanPathEndpoints({
    startX,
    startY,
    endX,
    endY,
    stepX,
    stepY,
    scanPattern,
    scanDirection,
  });

  const midY = AREA_TOP + AREA_HEIGHT / 2;
  const labelAnchor = (point, kind) => {
    const y = toSvgY(point.y);
    const isBelow = (kind === 'start') ? (y >= midY) : (y < midY);

    return {
      x: toSvgX(point.x),
      y: isBelow ? y + LABEL_OFFSET : y - 5,
    };
  };

  const startLabel = start && labelAnchor(start, 'start');
  const endLabel = end && labelAnchor(end, 'end');

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

      {/* Path start marker */}
      {start && (
        <g>
          <circle
            cx={toSvgX(start.x)}
            cy={toSvgY(start.y)}
            r="4"
            fill="#0066cc"
          />
          <text
            x={startLabel.x}
            y={startLabel.y}
            textAnchor="middle"
            fontSize="8"
            fill="#0066cc"
          >
            {i18n._('START')}
          </text>
        </g>
      )}

      {/* Path end marker: ring, so it reads as an end, not another probe point */}
      {end && (
        <g>
          <circle
            cx={toSvgX(end.x)}
            cy={toSvgY(end.y)}
            r="4"
            fill="none"
            stroke="#cc0000"
            strokeWidth="2"
          />
          <text
            x={endLabel.x}
            y={endLabel.y}
            textAnchor="middle"
            fontSize="8"
            fill="#cc0000"
          >
            {i18n._('END')}
          </text>
        </g>
      )}

      {/* Width dimension label (bottom) */}
      <text
        x={AREA_LEFT + AREA_WIDTH / 2}
        y={AREA_TOP + AREA_HEIGHT + LABEL_OFFSET}
        textAnchor="middle"
        fontSize="9"
        fill="#666"
      >
        {i18n._('{{value}} {{- units}}', { value: width, units: displayUnits })}
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
        {i18n._('{{value}} {{- units}}', { value: height, units: displayUnits })}
      </text>
    </svg>
  );
};

ProbeAreaDiagram.propTypes = {
  startX: PropTypes.number,
  startY: PropTypes.number,
  endX: PropTypes.number,
  endY: PropTypes.number,
  stepX: PropTypes.number,
  stepY: PropTypes.number,
  scanPattern: PropTypes.string,
  scanDirection: PropTypes.string,
  units: PropTypes.string,
};

export default ProbeAreaDiagram;
