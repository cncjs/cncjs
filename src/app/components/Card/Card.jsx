import cx from 'classnames';
import React from 'react';
import { tagPropType } from 'app/components/shared/utils';
import styles from './styles/index.styl';
import Resolver from './Resolver';

const Card = ({
    className,
    style,
    tag: Component,
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
