import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';
import i18n from 'app/lib/i18n';
import { SCAN_PATTERNS, createScanPath } from './scanPath';
import styles from './SetupProbeView.styl';

const GLYPH_WIDTH = 56;
const GLYPH_HEIGHT = 40;
const GLYPH_PADDING = 6;

// Fixed demo grid: the glyph explains the pattern, not the probe area size.
const DEMO = {
  startX: 0,
  endX: 3,
  stepX: 1,
  startY: 0,
  endY: 2,
  stepY: 1,
};

const PATTERN_LABELS = {
  raster: () => i18n._('Raster'),
  zigzag: () => i18n._('Zigzag'),
  'spiral-in': () => i18n._('Spiral In'),
  'spiral-out': () => i18n._('Spiral Out'),
};

const ScanPatternPreview = ({ scanPattern, scanDirection }) => {
  const toGlyphPoint = (point) => ({
    x: GLYPH_PADDING + (point.x / DEMO.endX) * (GLYPH_WIDTH - GLYPH_PADDING * 2),
    y: GLYPH_HEIGHT - GLYPH_PADDING - (point.y / DEMO.endY) * (GLYPH_HEIGHT - GLYPH_PADDING * 2),
  });

  return (
    <div className={styles.scanPathPreview}>
      {SCAN_PATTERNS.map((pattern) => {
        const gridPath = createScanPath({
          ...DEMO,
          scanPattern: pattern,
          scanDirection,
        });

        // A move that changes both coordinates is a rapid between sweeps, not a
        // probing move. Draw those dashed so the sweeps stay readable.
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
        const isSelected = pattern === scanPattern;

        return (
          <div
            key={pattern}
            className={classNames(
              styles.glyph,
              { [styles.selected]: isSelected },
            )}
          >
            <svg
              width={GLYPH_WIDTH}
              height={GLYPH_HEIGHT}
              viewBox={`0 0 ${GLYPH_WIDTH} ${GLYPH_HEIGHT}`}
              aria-hidden="true"
              focusable="false"
            >
              {rapids.map(([from, to], index) => {
                const a = toGlyphPoint(from);
                const b = toGlyphPoint(to);

                return (
                  <line
                    key={`rapid-${index}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="#bbb"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                );
              })}
              {sweeps.map((sweep, index) => (
                <polyline
                  key={`sweep-${index}`}
                  points={sweep.map((point) => {
                    const { x, y } = toGlyphPoint(point);

                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke={isSelected ? '#0066cc' : '#999'}
                  strokeWidth="1.2"
                />
              ))}
              <circle cx={start.x} cy={start.y} r="2.6" fill="#0066cc" />
              <circle cx={end.x} cy={end.y} r="2.6" fill="none" stroke="#cc0000" strokeWidth="1.4" />
            </svg>
            <div className={styles.glyphLabel}>
              {PATTERN_LABELS[pattern]()}
            </div>
          </div>
        );
      })}
    </div>
  );
};

ScanPatternPreview.propTypes = {
  scanPattern: PropTypes.oneOf(SCAN_PATTERNS).isRequired,
  scanDirection: PropTypes.oneOf(['x', 'y']).isRequired,
};

export default ScanPatternPreview;
