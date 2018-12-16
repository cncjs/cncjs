import React from 'react';
import cx from 'classnames';
import styles from './index.styl';

const ModalTitle = (props) => {
    const { children } = props;
    const doEllipsis = typeof children === 'string';
    return (
        <div
            {...props}
            className={cx(
                styles.modalTitle,
                { [styles.ellipsis]: doEllipsis }
            )}
        />
    );
};

export default ModalTitle;
