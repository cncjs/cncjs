import React from 'react';
import PropTypes from 'prop-types';
import createFormControl from '../../createFormControl';

const Select = ({ error, blurred, changed, ...props }) => (
    <div>
        <select {...props} />
        {blurred && changed && error}
    </div>
);

Select.propTypes = {
    error: PropTypes.oneOfType([PropTypes.node, PropTypes.string])
};

export default createFormControl()(Select);
