import cx from 'classnames';
import React from 'react';
import { tagPropType } from 'app/components/shared/utils';
import Resolver from './Resolver';
import styles from './styles/index.styl';

const CardFooter = ({
    className,
    style,
    tag: Component,
    ...props
}) => (
    <Resolver>
        {value => {
            const { borderColor, borderWidth, spacerX, spacerY } = value;

            if (borderColor !== undefined) {
                style = { borderTopColor: borderColor, ...style };
            }
            if (borderWidth !== undefined) {
                style = { borderTopWidth: borderWidth, ...style };
            }

            style = {
                padding: `${spacerY} ${spacerX}`,
                ...style,
            };

            return (
                <Component
                    {...props}
                    style={style}
                    className={cx(className, styles.cardFooter)}
                />
            );
        }}
    </Resolver>
);

CardFooter.propTypes = {
    tag: tagPropType,
};

CardFooter.defaultProps = {
    tag: 'div',
};

export default CardFooter;
