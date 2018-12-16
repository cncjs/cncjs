import cx from 'classnames';
import React from 'react';
import styles from './index.styl';

const PanelBody = ({ className, ...props }) => (
    <div {...props} className={cx(className, styles.panelBody)} />
);

export default PanelBody;
