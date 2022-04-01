import cx from 'classnames';
import React from 'react';
import Notification from './Notification';
import styles from './index.styl';

function ToastNotification({ className, ...props }) {
  return (
    <Notification
      {...props}
      className={cx(className, styles.toastNotification)}
    />
  );
}

ToastNotification.propTypes = {
  ...Notification.propTypes
};

ToastNotification.defaultProps = {
  ...Notification.defaultProps
};

export default ToastNotification;
