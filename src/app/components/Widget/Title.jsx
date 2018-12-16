import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

const Title = ({ className, ...props }) => (
    <div
        {...props}
        className={cx(className, styles.widgetTitle)}
    />
);

export default Title;
