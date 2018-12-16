import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

const Footer = ({ className, ...props }) => (
    <div
        {...props}
        className={cx(className, styles.widgetFooter)}
    />
);

export default Footer;
