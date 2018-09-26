import cx from 'classnames';
import React from 'react';
import styles from './InlineError.styl';

const InlineError = ({ className, children, ...props }) => (
    <div
        {...props}
        className={cx(
            className,
            styles['help-block'],
            styles['help-block-invalid']
        )}
    >
        <i
            className={cx(
                'tmicon',
                'tmicon-warning-circle',
                styles.icon
            )}
        />
        {children}
    </div>
);

export default InlineError;
