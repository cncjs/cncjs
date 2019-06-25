import cx from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import styles from './index.styl';

const Center = ({
    className,
    horizontal,
    vertical,
    stretched,
    ...props
}) => (
    <div
        {...props}
        className={cx(className, {
            [styles.horizontal]: !!horizontal,
            [styles.vertical]: !!vertical,
            [styles.stretched]: !!stretched
        })}
    />
);

Center.propTypes = {
    horizontal: PropTypes.bool,
    vertical: PropTypes.bool,
    stretched: PropTypes.bool
};

Center.defaultProps = {
    horizontal: false,
    vertical: false,
    stretched: false
};

export default Center;
