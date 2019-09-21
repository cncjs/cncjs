import cx from 'classnames';
import React from 'react';
import { tagPropType } from 'app/components/shared/utils';
import Resolver from './Resolver';
import styles from './styles/index.styl';

const CardDeck = ({
    className,
    tag: Component,
    ...props
}) => (
    <Resolver>
        {value => {
            return (
                <Component
                    {...props}
                    className={cx(className, styles.cardDeck)}
                />
            );
        }}
    </Resolver>
);

CardDeck.propTypes = {
    tag: tagPropType,
};

CardDeck.defaultProps = {
    tag: 'div',
};

export default CardDeck;
