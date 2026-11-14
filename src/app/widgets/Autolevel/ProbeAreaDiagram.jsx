import { useTheme } from '@tonic-ui/react';
import React from 'react';
import i18n from '@app/lib/i18n';
import { toDisplayUnits } from '@app/lib/units';
import { createAxisPositions, getScanPathEndpoints } from './scanPath';

const SVG_WIDTH = 230;
const SVG_HEIGHT = 140;
const AREA_LEFT = 30;
const AREA_TOP = 10;
const AREA_WIDTH = 160;
const AREA_HEIGHT = 100;
const MAX_POINTS_PER_AXIS = 20;
const LABEL_OFFSET = 11;

const isFiniteNumber = value => typeof value === 'number' && Number.isFinite(value);

// Thin out the grid without moving its last point to the requested end bound.
const sampleAxisPositions = positions => {
  const stride = Math.ceil(positions.length / MAX_POINTS_PER_AXIS);
  const sampled = positions.filter((_, index) => index % stride === 0);
  if (sampled[sampled.length - 1] !== positions[positions.length - 1]) {
    sampled.push(positions[positions.length - 1]);
  }
  return sampled;
};

/**
 * @param {{startX?: number, startY?: number, endX?: number, endY?: number, stepX?: number, stepY?: number, scanPattern?: string, scanDirection?: string, units?: string}} props
 */
const ProbeAreaDiagram = ({
  startX,
  startY,
  endX,
  endY,
  stepX,
  stepY,
  scanPattern = 'raster',
  scanDirection = 'x',
  units,
}) => {
  const theme = useTheme();
  const displayUnits = toDisplayUnits(units);
  const hasXBounds = [startX, endX].every(isFiniteNumber);
  const hasYBounds = [startY, endY].every(isFiniteNumber);
  const width = hasXBounds ? endX - startX : 0;
  const height = hasYBounds ? endY - startY : 0;
  const validGrid = hasXBounds && hasYBounds &&
    isFiniteNumber(stepX) && isFiniteNumber(stepY) &&
    stepX > 0 && stepY > 0 && width >= 0 && height >= 0;
  const normalize = (value, start, span) => (span > 0 ? (value - start) / span : 0);
  const toSvgX = x => AREA_LEFT + normalize(x, startX, width) * AREA_WIDTH;
  const toSvgY = y => AREA_TOP + AREA_HEIGHT - normalize(y, startY, height) * AREA_HEIGHT;
  let displayX = [];
  let displayY = [];
  let start = null;
  let end = null;
  if (validGrid) {
    displayX = sampleAxisPositions(createAxisPositions(startX, endX, stepX));
    displayY = sampleAxisPositions(createAxisPositions(startY, endY, stepY));
    ({ start, end } = getScanPathEndpoints({
      startX, startY, endX, endY, stepX, stepY, scanPattern, scanDirection,
    }));
  }
  const dots = [];
  displayX.forEach(x => {
    displayY.forEach(y => dots.push({ x: toSvgX(x), y: toSvgY(y) }));
  });
  const dotRadius = Math.max(0.6, Math.min(2, 30 / Math.max(displayX.length, displayY.length)));
  const midY = AREA_TOP + AREA_HEIGHT / 2;
  const labelAnchor = (point, kind) => {
    const y = toSvgY(point.y);
    const isBelow = kind === 'start' ? y >= midY : y < midY;
    return { x: toSvgX(point.x), y: isBelow ? y + LABEL_OFFSET : y - 5 };
  };
  const startLabel = start && labelAnchor(start, 'start');
  const endLabel = end && labelAnchor(end, 'end');

  return (
    <svg
      role="img"
      aria-label={i18n._('Probe area diagram')}
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
    >
      {/* Probe area rectangle */}
      <rect
        x={AREA_LEFT}
        y={AREA_TOP}
        width={AREA_WIDTH}
        height={AREA_HEIGHT}
        fill={theme.get('colors.background.high')}
        stroke={theme.get('colors.border.primary')}
        strokeWidth="1"
      />

      {/* Grid dots */}
      {dots.map(dot => (
        <circle
          key={`${dot.x}-${dot.y}`}
          cx={dot.x}
          cy={dot.y}
          r={dotRadius}
          fill={theme.get('colors.error.icon')}
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
            fill={theme.get('colors.info.icon')}
          />
          <text
            x={startLabel.x}
            y={startLabel.y}
            textAnchor="middle"
            fontSize="8"
            fill={theme.get('colors.info._onOverlay.text')}
          >
            {i18n._('START')}
          </text>
        </g>
      )}

      {/* The ring distinguishes the end from a filled start marker. */}
      {end && (
        <g>
          <circle
            cx={toSvgX(end.x)}
            cy={toSvgY(end.y)}
            r="4"
            fill="none"
            stroke={theme.get('colors.error.icon')}
            strokeWidth="2"
          />
          <text
            x={endLabel.x}
            y={endLabel.y}
            textAnchor="middle"
            fontSize="8"
            fill={theme.get('colors.error.text')}
          >
            {i18n._('END')}
          </text>
        </g>
      )}

      {/* Width dimension label (bottom) */}
      {hasXBounds && (
        <text
          x={AREA_LEFT + AREA_WIDTH / 2}
          y={AREA_TOP + AREA_HEIGHT + LABEL_OFFSET * 2}
          textAnchor="middle"
          fontSize="9"
          fill={theme.get('colors.text.secondary')}
        >
          {i18n._('{{value}} {{- units}}', { value: width, units: displayUnits })}
        </text>
      )}

      {/* Height dimension label (right) */}
      {hasYBounds && (
        <text
          x={AREA_LEFT + AREA_WIDTH + 8}
          y={AREA_TOP + AREA_HEIGHT / 2}
          textAnchor="start"
          dominantBaseline="central"
          fontSize="9"
          fill={theme.get('colors.text.secondary')}
        >
          {i18n._('{{value}} {{- units}}', { value: height, units: displayUnits })}
        </text>
      )}
    </svg>
  );
};

export default ProbeAreaDiagram;
