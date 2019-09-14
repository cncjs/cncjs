import cx from 'classnames';
import React from 'react';
import styles from './styles/index.styl';
import Resolver from './Resolver';
import { tagPropType } from './utils';

const Card = ({
    className,
    tag: Component,
    style,
    ...props
}) => (
    <Resolver>
        {value => {
            const { borderColor, borderRadius, borderWidth } = value;

            if (borderColor !== undefined) {
                style = { borderColor, ...style };
            }
            if (borderRadius !== undefined) {
                style = { borderRadius, ...style };
            }
            if (borderWidth !== undefined) {
                style = { borderWidth, ...style };
            }

            return (
                <Component
                    {...props}
                    style={style}
                    className={cx(className, styles.card)}
                />
            );
        }}
    </Resolver>
);

Card.propTypes = {
    tag: tagPropType,
};

Card.defaultProps = {
    tag: 'div',
};

export default Card;
