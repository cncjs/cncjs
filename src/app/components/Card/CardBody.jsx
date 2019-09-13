import cx from 'classnames';
import React from 'react';
import styles from './styles/index.styl';
import { tagPropType } from './utils';

const CardBody = ({
    className,
    tag: Component,
    ...props
}) => (
    <Component {...props} className={cx(className, styles.cardBody)} />
);

CardBody.propTypes = {
    tag: tagPropType,
};

CardBody.defaultProps = {
    tag: 'div',
};

export default CardBody;
