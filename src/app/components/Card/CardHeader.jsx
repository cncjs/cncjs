import cx from 'classnames';
import React from 'react';
import { tagPropType } from 'app/components/shared/utils';
import Resolver from './Resolver';
import styles from './styles/index.styl';

const CardHeader = ({
    className,
    style,
    tag: Component,
    ...props
}) => (
    <Resolver>
        {value => {
            const { borderColor, borderWidth, spacerX, spacerY } = value;

            if (borderColor !== undefined) {
                style = { borderBottomColor: borderColor, ...style };
            }
            if (borderWidth !== undefined) {
                style = { borderBottomWidth: borderWidth, ...style };
            }

            style = {
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
