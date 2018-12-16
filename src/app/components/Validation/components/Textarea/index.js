import React from 'react';
import PropTypes from 'prop-types';
import createFormControl from '../../createFormControl';

const Textarea = ({ error, blurred, changed, ...props }) => (
    <div>
        <textarea {...props} />
        {blurred && changed && error}
    </div>
);

Textarea.propTypes = {
    error: PropTypes.oneOfType([PropTypes.node, PropTypes.string])
};

export default createFormControl()(Textarea);
