import classNames from 'classnames';
import React from 'react';
import styles from './index.styl';

const Toolbar = ({ className, ...props }) => (
    <div
        {...props}
        className={classNames(className, styles.widgetToolbar)}
    />
);

export default Toolbar;
