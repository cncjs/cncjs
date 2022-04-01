import React from 'react';
import PropTypes from 'prop-types';
import createFormControl from '../../createFormControl';

function Input({ error, blurred, changed, ...props }) {
  return (
    <div>
      <input {...props} />
      {blurred && changed && error}
    </div>
  );
}

Input.propTypes = {
  error: PropTypes.oneOfType([PropTypes.node, PropTypes.string])
};

export default createFormControl()(Input);
