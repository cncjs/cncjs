import React from 'react';
import PropTypes from 'prop-types';
import createFormControl from '../../createFormControl';

function Select({ error, blurred, changed, ...props }) {
  return (
    <div>
      <select {...props} />
      {blurred && changed && error}
    </div>
  );
}

Select.propTypes = {
  error: PropTypes.oneOfType([PropTypes.node, PropTypes.string])
};

export default createFormControl()(Select);
