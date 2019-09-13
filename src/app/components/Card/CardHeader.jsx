import cx from 'classnames';
import React from 'react';
import styles from './styles/index.styl';
import { tagPropType } from './utils';

const CardHeader = ({
    className,
    tag: Component,
    ...props
}) => (
    <Component {...props} className={cx(className, styles.cardHeader)} />
);

CardHeader.propTypes = {
    tag: tagPropType,
};

CardHeader.defaultProps = {
    tag: 'div',
};

export default CardHeader;
