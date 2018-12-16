import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

const Content = ({ className, ...props }) => (
    <div
        {...props}
        className={cx(className, styles.widgetContent)}
    />
);

export default Content;
