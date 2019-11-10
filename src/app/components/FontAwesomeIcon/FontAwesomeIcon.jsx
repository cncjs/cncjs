import { FontAwesomeIcon as Component } from '@fortawesome/react-fontawesome';
import cx from 'classnames';
import React from 'react';
import styles from './FontAwesomeIcon.styl';

const FontAwesomeIcon = React.forwardRef(({
    className,
    spinReverse,
    ...props
}, ref) => (
    <Component
        {...props}
        ref={ref}
        className={cx(className, {
            [styles.spinReverse]: !!spinReverse,
        })}
    />
));

export default FontAwesomeIcon;
