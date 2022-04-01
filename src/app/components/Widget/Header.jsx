import cx from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import styles from './index.styl';

function Header({ fixed, className, ...props }) {
  return (
    <div
      {...props}
      className={cx(
        className,
        styles.widgetHeader,
        { [styles.widgetHeaderFixed]: fixed }
      )}
    />
  );
}

Header.propTypes = {
  fixed: PropTypes.bool
};
Header.defaultProps = {
  fixed: false
};

export default Header;
