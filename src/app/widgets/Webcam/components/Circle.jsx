import React from 'react';

/**
 * @param {{ color?: string, opacity?: number, diameter?: number, width?: number, [key: string]: unknown }} props
 */
function Circle({
  color = '#fff',
  opacity = 0.8,
  diameter = 0,
  width = 1,
  ...props
}) {
  const radius = (diameter - width) / 2;
  return (
    <svg
      {...props}
      width={diameter}
      height={diameter}
      viewBox={`0 0 ${diameter} ${diameter}`}
    >
      <circle
        cx={diameter / 2}
        cy={diameter / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeOpacity={opacity}
        strokeWidth={width}
      />
    </svg>
  );
}

export default Circle;
