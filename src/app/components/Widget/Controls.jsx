import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

const Controls = ({ className, ...props }) => (
    <div
        {...props}
        className={cx(className, styles.widgetControls)}
    />
);

export default Controls;
