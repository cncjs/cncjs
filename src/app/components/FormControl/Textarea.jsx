import cx from 'classnames';
import React from 'react';
import FormControl from './FormControl';
import styles from './Textarea.styl';

const Textarea = (props) => (
    <FormControl {...props} tag="textarea" className={cx(props.className, styles.textarea)} />
);

export default Textarea;
