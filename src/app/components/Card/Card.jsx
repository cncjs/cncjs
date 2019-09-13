import cx from 'classnames';
import React from 'react';
import styles from './styles/index.styl';
import { tagPropType } from './utils';

const Card = ({
    className,
    tag: Component,
    ...props
}) => (
    <Component {...props} className={cx(className, styles.card)} />
);

Card.propTypes = {
    tag: tagPropType,
};

Card.defaultProps = {
    tag: 'div',
};

export default Card;
