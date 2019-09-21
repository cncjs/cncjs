import cx from 'classnames';
import _toNumber from 'lodash/toNumber';
import PropTypes from 'prop-types';
import React from 'react';
import { tagPropType } from 'app/components/shared/utils';
import styles from './styles/index.styl';

const ProgressBar = ({
    className,
    style,
    tag: Component,
    value,
    min,
    max,
    striped,
    animated,
    ...props
}) => {
    const percent = ((_toNumber(value) / _toNumber(max)) * 100);

    return (
        <Component
            {...props}
            className={cx(className, styles.progressBar, {
                [styles.progressBarStriped]: striped,
                [styles.progressBarAnimated]: animated,
            })}
            style={{ width: `${percent}%`, ...style }}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={min}
            aria-valuemax={max}
        />
    );
};

ProgressBar.propTypes = {
    tag: tagPropType,
    value: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
    ]),
    min: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
    ]),
    max: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
    ]),
    striped: PropTypes.bool,
    animated: PropTypes.bool,
};

ProgressBar.defaultProps = {
    tag: 'div',
    value: 0,
    min: 0,
    max: 100,
};

export default ProgressBar;
