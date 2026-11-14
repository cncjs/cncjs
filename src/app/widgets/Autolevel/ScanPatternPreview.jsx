import { Box, useColorStyle, useTheme } from '@tonic-ui/react';
import React from 'react';
import i18n from '@app/lib/i18n';
import { SCAN_PATTERNS, createScanPath } from './scanPath';
import styles from './SetupProbeView.styl';

const GLYPH_WIDTH = 56;
const GLYPH_HEIGHT = 40;
const GLYPH_PADDING = 6;
const DEMO = { startX: 0, endX: 3, stepX: 1, startY: 0, endY: 2, stepY: 1 };

const PATTERN_LABELS = {
  raster: () => i18n._('Raster'),
  zigzag: () => i18n._('Zigzag'),
  'spiral-in': () => i18n._('Spiral In'),
  'spiral-out': () => i18n._('Spiral Out'),
};

const toGlyphPoint = point => ({
  x: GLYPH_PADDING + (point.x / DEMO.endX) * (GLYPH_WIDTH - GLYPH_PADDING * 2),
  y: GLYPH_HEIGHT - GLYPH_PADDING - (point.y / DEMO.endY) * (GLYPH_HEIGHT - GLYPH_PADDING * 2),
});

/**
 * @param {{scanPattern?: string, scanDirection?: string}} props
 */
function ScanPatternPreview({ scanPattern = 'raster', scanDirection = 'x' }) {
  const theme = useTheme();
  const [colorStyle] = useColorStyle();

  return (
    <Box className={styles.scanPathPreview} role="group" aria-label={i18n._('Scan pattern preview')}>
      {SCAN_PATTERNS.map(pattern => {
        const gridPath = createScanPath({ ...DEMO, scanPattern: pattern, scanDirection });
        const sweeps = [];
        const rapids = [];
        let sweep = [gridPath[0]];
        for (let index = 1; index < gridPath.length; index += 1) {
          const previous = gridPath[index - 1];
          const point = gridPath[index];
          if (point.x !== previous.x && point.y !== previous.y) {
            sweeps.push(sweep);
            rapids.push([previous, point]);
            sweep = [point];
          } else {
            sweep.push(point);
          }
        }
        sweeps.push(sweep);

        const start = toGlyphPoint(gridPath[0]);
        const end = toGlyphPoint(gridPath[gridPath.length - 1]);
        const selected = pattern === scanPattern;
        const label = PATTERN_LABELS[pattern]();
        return (
          <Box
            key={pattern}
            className={styles.glyph}
            role="img"
            aria-label={label}
            data-selected={selected ? '' : undefined}
            sx={{
              backgroundColor: selected ? colorStyle.background.secondary : 'transparent',
              border: '1px solid',
              borderColor: selected ? 'border.primary' : 'transparent',
              borderRadius: '3px',
              color: selected ? 'text.primary' : 'text.secondary',
            }}
          >
            <svg
              width={GLYPH_WIDTH} height={GLYPH_HEIGHT}
              viewBox={`0 0 ${GLYPH_WIDTH} ${GLYPH_HEIGHT}`}
              aria-hidden="true" focusable="false"
            >
              {rapids.map(([from, to]) => {
                const a = toGlyphPoint(from);
                const b = toGlyphPoint(to);
                return (
                  <line
                    key={`rapid-${from.x}-${from.y}-${to.x}-${to.y}`}
                    x1={a.x} y1={a.y}
                    x2={b.x} y2={b.y}
                    stroke={theme.get('colors.border.primary')}
                    strokeWidth="1" strokeDasharray="2 2"
                  />
                );
              })}
              {sweeps.map(points => (
                <polyline
                  key={`sweep-${points[0].x}-${points[0].y}`}
                  points={points.map(point => {
                    const { x, y } = toGlyphPoint(point);
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke={theme.get(selected ? 'colors.text.primary' : 'colors.text.secondary')}
                  strokeWidth="1.2"
                />
              ))}
              <circle
                cx={start.x} cy={start.y} r="2.6"
                fill={theme.get('colors.info.icon')}
              />
              <circle
                cx={end.x} cy={end.y} r="2.6"
                fill="none" stroke={theme.get('colors.error.icon')} strokeWidth="1.4"
              />
            </svg>
            <Box className={styles.glyphLabel}>{label}</Box>
          </Box>
        );
      })}
    </Box>
  );
}

export default ScanPatternPreview;
