import cx from 'classnames';
import React from 'react';
import styles from './FormGroup.styl';

const FormGroup = (props) => (
    <div {...props} className={cx(props.className, styles.formGroup)} />
);

export default FormGroup;
