import cx from 'classnames';
import React from 'react';
import { tagPropType } from '@app/components/shared/utils';
import Resolver from './Resolver';
import styles from './styles/index.styl';

function CardFooter({
  className,
  style,
  tag: Component,
  ...props
}) {
  return (
    <Resolver>
      {value => {
        const { borderColor, borderWidth, spacingX, spacingY } = value;

        if (borderColor !== undefined) {
          style = { borderTopColor: borderColor, ...style };
        }
        if (borderWidth !== undefined) {
          style = { borderTopWidth: borderWidth, ...style };
        }

        style = {
          padding: `${spacingY} ${spacingX}`,
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
}

CardFooter.propTypes = {
  tag: tagPropType,
};

CardFooter.defaultProps = {
  tag: 'div',
};

export default CardFooter;
