import React from 'react';
import classNames from 'classnames';
import styles from './index.styl';

const ModalTitle = (props) => {
    const { children } = props;
    const doEllipsis = typeof children === 'string';
    return (
        <div
            {...props}
            className={classNames(
                styles.modalTitle,
                { [styles.ellipsis]: doEllipsis }
            )}
        />
    );
};

export default ModalTitle;
