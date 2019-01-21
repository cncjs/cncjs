import cx from 'classnames';
import React from 'react';
import styles from './FormControl.styl';

const FormControl = ({
    componentType,
    tag: Component = 'div',
    size,
    className,
    ...props
}) => (
    <Component
        {...props}
        className={cx(className, styles.formControl, {
            [styles.formControlLg]: size === 'lg' || size === 'large',
            [styles.formControlSm]: size === 'sm' || size === 'small',
        })}
    />
);

export default FormControl;
