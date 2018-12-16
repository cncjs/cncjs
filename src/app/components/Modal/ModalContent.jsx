import cx from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import styles from './index.styl';

const mapSizeToStyle = (size) => ({
    'xs': styles.xs,
    'sm': styles.sm,
    'md': styles.md,
    'lg': styles.lg,
    'extra-small': styles.xs,
    'small': styles.sm,
    'medium': styles.md,
    'large': styles.lg
}[size]);

const ModalContent = ({ className, size, ...props }) => (
    <div
        {...props}
        className={cx(
            className,
            styles.modalContent,
            mapSizeToStyle(size)
        )}
    />
);

ModalContent.propTypes = {
    size: PropTypes.oneOf([
        '',
        'xs',
        'sm',
        'md',
        'lg',
        'large',
        'medium',
        'small',
        'extra-small'
    ])
};

export default ModalContent;
