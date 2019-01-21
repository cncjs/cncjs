import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

const InputGroupPrepend = ({
    tag: Component = 'div',
    className,
    ...props
}) => (
    <Component
        {...props}
        className={cx(className, styles.inputGroupPrepend)}
    />
);

export default InputGroupPrepend;
