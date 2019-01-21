import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

const InputGroupAppend = ({
    tag: Component = 'div',
    className,
    ...props
}) => (
    <Component
        {...props}
        className={cx(className, styles.inputGroupAppend)}
    />
);

export default InputGroupAppend;
