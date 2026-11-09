import { useTheme } from '@tonic-ui/react';
import React from 'react';
import i18n from '@app/lib/i18n';
import { toDisplayUnits } from '@app/lib/units';

const SVG_WIDTH = 230;
const SVG_HEIGHT = 140;
const AREA_LEFT = 30;
const AREA_TOP = 10;
const AREA_WIDTH = 160;
const AREA_HEIGHT = 100;

/**
 * @param {{startX?: number, startY?: number, endX?: number, endY?: number, stepX?: number, stepY?: number, units?: string}} props
 */
const ProbeAreaDiagram = ({
  startX,
  startY,
  endX,
  endY,
  stepX,
  stepY,
  units,
}) => {
  const theme = useTheme();
  const displayUnits = toDisplayUnits(units);
  const width = endX - startX;
  const height = endY - startY;
  const numPointsX = Math.max(2, Math.floor(width / stepX) + 1);
  const numPointsY = Math.max(2, Math.floor(height / stepY) + 1);

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

      {/* Start corner marker */}
      <circle
        cx={AREA_LEFT}
        cy={AREA_TOP + AREA_HEIGHT}
        r="4"
        fill={theme.get('colors.info.icon')}
        stroke={theme.get('colors.background.highest')}
        strokeWidth="1"
      />
      <text
        x={AREA_LEFT}
        y={AREA_TOP + AREA_HEIGHT + 12}
        textAnchor="middle"
        fontSize="8"
        fill={theme.get('colors.info._onOverlay.text')}
      >
        {i18n._('START')}
      </text>

      {/* End corner marker */}
      <circle
        cx={AREA_LEFT + AREA_WIDTH}
        cy={AREA_TOP}
        r="4"
        fill={theme.get('colors.error.icon')}
        stroke={theme.get('colors.background.highest')}
        strokeWidth="1"
      />
      <text
        x={AREA_LEFT + AREA_WIDTH}
        y={AREA_TOP - 4}
        textAnchor="middle"
        fontSize="8"
        fill={theme.get('colors.error.text')}
      >
        {i18n._('END')}
      </text>

      {/* Width dimension label (bottom) */}
      <text
        x={AREA_LEFT + AREA_WIDTH / 2}
        y={AREA_TOP + AREA_HEIGHT + 12}
        textAnchor="middle"
        fontSize="9"
        fill={theme.get('colors.text.secondary')}
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
        fill={theme.get('colors.text.secondary')}
      >
        {i18n._('{{value}} {{- units}}', { value: height, units: displayUnits })}
      </text>
    </svg>
  );
};

export default ProbeAreaDiagram;
