import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

const Panel = ({ className, ...props }) => (
    <div {...props} className={cx(className, styles.panel, styles.panelDefault)} />
);

export default Panel;
