import cx from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import styles from './index.styl';

function Terminal({ className, style, containerRef }) {
  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="Console output"
      ref={containerRef}
      className={cx(className, styles.terminalContainer)}
      style={style}
    />
  );
}

Terminal.propTypes = {
  className: PropTypes.string,
  style: PropTypes.object,
  containerRef: PropTypes.func,
};

export default Terminal;
