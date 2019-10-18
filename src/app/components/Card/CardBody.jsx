import cx from 'classnames';
import React from 'react';
import { tagPropType } from 'app/components/shared/utils';
import Resolver from './Resolver';
import styles from './styles/index.styl';

const CardBody = ({
    className,
    style,
    tag: Component,
    ...props
}) => (
    <Resolver>
        {value => {
            const { spacingX } = value;
            style = {
                padding: `${spacingX}`,
                ...style,
            };

            return (
                <Component
                    {...props}
                    style={style}
                    className={cx(className, styles.cardBody)}
                />
            );
        }}
    </Resolver>
);

CardBody.propTypes = {
    tag: tagPropType,
};

CardBody.defaultProps = {
    tag: 'div',
};

export default CardBody;
