import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';
import styles from './index.styl';

const TabPane = ({ active, lazy, eventKey, className, ...props }) => {
    if (!active && lazy) {
        return null;
    }
    return (
        <div
            {...props}
            className={cx(className, styles.tabPane, {
                [styles.active]: active,
                [styles.inactive]: !active
            })}
        />
    );
};

TabPane.propTypes = {
    active: PropTypes.bool,
    eventKey: PropTypes.any,
    lazy: PropTypes.bool,
};

TabPane.defaultProps = {
    active: false,
    lazy: false,
};

export default TabPane;
