import { Box } from '@tonic-ui/react';
import React from 'react';

/**
 * @param {{
 *   containerRef: (node: HTMLElement | null) => void,
 *   show?: boolean,
 * }} props
 */
function Visualizer({ containerRef, show = false }) {
  return (
    <Box
      aria-label="3D Visualizer"
      ref={containerRef}
      style={{
        height: '100%',
        visibility: show ? 'visible' : 'hidden',
        width: '100%',
      }}
    />
  );
}

export default Visualizer;
