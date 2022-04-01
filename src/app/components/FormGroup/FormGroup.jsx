import cx from 'classnames';
import React from 'react';
import styles from './FormGroup.styl';

function FormGroup(props) {
  return <div {...props} className={cx(props.className, styles.formGroup)} />;
}

export default FormGroup;
