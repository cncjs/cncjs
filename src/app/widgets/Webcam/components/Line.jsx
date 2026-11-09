import React from 'react';

/**
 * @param {{ vertical?: boolean, color?: string, opacity?: number, length?: number|string, width?: number, [key: string]: unknown }} props
 */
function Line({
  vertical = false,
  color = '#fff',
  opacity = 0.8,
  length = 0,
  width = 1,
  ...props
}) {
  const size = typeof length === 'number' ? length : 100;
  return vertical ? (
    <svg
      {...props}
      width={width}
      height={length}
      viewBox={`0 0 ${width} ${size}`}
    >
      <line
        x1={width / 2}
        x2={width / 2}
        y2={size}
        stroke={color}
        strokeOpacity={opacity}
        strokeWidth={width}
      />
    </svg>
  ) : (
    <svg
      {...props}
      width={length}
      height={width}
      viewBox={`0 0 ${size} ${width}`}
    >
      <line
        y1={width / 2}
        y2={width / 2}
        x2={size}
        stroke={color}
        strokeOpacity={opacity}
        strokeWidth={width}
      />
    </svg>
  );
}

export default Line;
