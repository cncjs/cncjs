import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

const ButtonToolbar = ({ className, ...props }) => (
    <div
        {...props}
        className={cx(className, styles.btnToolbar)}
    />
);

export default ButtonToolbar;
