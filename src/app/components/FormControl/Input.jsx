import React from 'react';
import FormControl from './FormControl';
import * as sharedPropTypes from './shared/prop-types';

const propTypes = {
    tag: sharedPropTypes.tag,
};

const defaultProps = {
    tag: 'input',
};

const Input = (props) => (
    <FormControl {...props} />
);

Input.propTypes = propTypes;
Input.defaultProps = defaultProps;

export default Input;
