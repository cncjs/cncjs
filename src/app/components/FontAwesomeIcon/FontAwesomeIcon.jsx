import { FontAwesomeIcon as Component } from '@fortawesome/react-fontawesome';
import cx from 'classnames';
import React from 'react';
import styles from './FontAwesomeIcon.styl';

const FontAwesomeIcon = ({ className, spinReverse, ...props }) => (
    <Component
        className={cx(className, {
            [styles.spinReverse]: !!spinReverse,
        })}
        {...props}
    />
);

export default FontAwesomeIcon;
