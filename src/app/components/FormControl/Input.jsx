import React from 'react';
import FormControl from './FormControl';
import * as sharedPropTypes from './shared/prop-types';

const propTypes = {
    tag: sharedPropTypes.tag,
};

const defaultProps = {
    tag: 'input',
};

const Input = React.forwardRef((props, ref) => (
    <FormControl ref={ref} {...props} />
));

Input.propTypes = propTypes;
Input.defaultProps = defaultProps;

export default Input;
