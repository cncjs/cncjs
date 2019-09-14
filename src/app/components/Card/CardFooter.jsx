import cx from 'classnames';
import React from 'react';
import Resolver from './Resolver';
import styles from './styles/index.styl';
import { tagPropType } from './utils';

const CardFooter = ({
    className,
    style,
    tag: Component,
    ...props
}) => (
    <Resolver>
        {value => {
            const { spacerX, spacerY } = value;
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
