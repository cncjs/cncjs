import cx from 'classnames';
import React from 'react';
import Resolver from './Resolver';
import styles from './styles/index.styl';
import { tagPropType } from './utils';

const CardHeader = ({
    className,
    style,
    tag: Component,
    ...props
}) => (
    <Resolver>
        {value => {
            const { borderColor, borderWidth, spacerX, spacerY } = value;
            style = {
                borderBottomColor: borderColor,
                borderBottomWidth: borderWidth,
                padding: `${spacerY} ${spacerX}`,
                ...style,
            };

            return (
                <Component
                    {...props}
                    style={style}
                    className={cx(className, styles.cardHeader)}
                />
            );
        }}
    </Resolver>
);

CardHeader.propTypes = {
    tag: tagPropType,
};

CardHeader.defaultProps = {
    tag: 'div',
};

export default CardHeader;
