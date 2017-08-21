import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import styles from './index.styl';

const Header = ({ fixed, className, ...props }) => (
    <div
        {...props}
        className={classNames(
            className,
            styles.widgetHeader,
            { [styles.widgetHeaderFixed]: fixed }
        )}
    />
);

Header.propTypes = {
    fixed: PropTypes.bool
};
Header.defaultProps = {
    fixed: false
};

export default Header;
