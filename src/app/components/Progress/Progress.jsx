import cx from 'classnames';
import React from 'react';
import { tagPropType } from 'app/components/shared/utils';
import ProgressBar from './ProgressBar';
import styles from './styles/index.styl';

const Progress = ({
    className,
    children,
    tag: Component,
    ...props
}) => (
    <Component
        {...props}
        className={cx(className, styles.progress)}
    >
        {typeof children === 'function'
            ? children({ ProgressBar })
            : children
        }
    </Component>
);

Progress.propTypes = {
    tag: tagPropType,
};

Progress.defaultProps = {
    tag: 'div',
};

Progress.Bar = ProgressBar;

export default Progress;
