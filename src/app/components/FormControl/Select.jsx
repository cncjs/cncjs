import cx from 'classnames';
import React from 'react';
import FormControl from './FormControl';
import styles from './Select.styl';

const Select = (props) => (
    <FormControl {...props} tag="select" className={cx(props.className, styles.select)} />
);

export default Select;
