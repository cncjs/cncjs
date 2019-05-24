import cx from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import Image from 'app/components/Image';
import styles from './ImageIcon.styl';

const iconStyle = {
    display: 'inline-block',
    fontSize: 'inherit',
    height: '1em',
    overflow: 'visible',
    verticalAlign: '-0.125em',
};

const ImageIcon = ({ spin, spinReverse, className, style, ...props }) => {
    style = { ...iconStyle, ...style };

    return (
        <Image
            {...props}
            className={cx(className, {
                [styles.spin]: !!spin,
                [styles.spinReverse]: !!spinReverse,
            })}
            style={style}
        />
    );
};

ImageIcon.propTypes = {
    ...Image.propTypes,
    spin: PropTypes.bool,
    spinReverse: PropTypes.bool,
};

export default ImageIcon;
