import PropTypes from 'prop-types';
import React from 'react';

const Progress = ({ now = 0, min = 0, max = 0 }) => {
  return (
    <div>
      <div className="progress">
        <div
          className="progress-bar"
          role="progressbar"
          aria-valuenow={now}
          aria-valuemin={min}
          aria-valuemax={max}
          style={{ width: now + '%' }}
        >
          <span>{now}%</span>
        </div>
      </div>
    </div>
  );
};

Progress.propTypes = {
  now: PropTypes.number,
  min: PropTypes.number,
  max: PropTypes.number
};

export default Progress;
