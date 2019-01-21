import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

const InputGroupText = ({
    tag: Component = 'div',
    className,
    ...props
}) => (
    <Component
        {...props}
        className={cx(className, styles.inputGroupText)}
    />
);

export default InputGroupText;
