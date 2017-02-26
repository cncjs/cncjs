import classNames from 'classnames';
import React from 'react';
import styles from './index.styl';

const Footer = ({ className, ...props }) => (
    <div
        {...props}
        className={classNames(className, styles.widgetFooter)}
    />
);

export default Footer;
