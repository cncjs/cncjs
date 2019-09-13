import cx from 'classnames';
import React from 'react';
import styles from './styles/index.styl';
import { tagPropType } from './utils';

const CardFooter = ({
    className,
    tag: Component,
    ...props
}) => (
    <Component {...props} className={cx(className, styles.cardFooter)} />
);

CardFooter.propTypes = {
    tag: tagPropType,
};

CardFooter.defaultProps = {
    tag: 'div',
};

export default CardFooter;
