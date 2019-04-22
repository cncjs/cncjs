import cx from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import * as sharedPropTypes from './shared/prop-types';
import styles from './index.styl';

const propTypes = {
    tag: sharedPropTypes.tag,
    lg: PropTypes.bool,
    md: PropTypes.bool,
    sm: PropTypes.bool,
};

const defaultProps = {
    tag: 'div',
};

const FormControl = ({
    className,
    tag: Tag,
    lg,
    md,
    sm,
    ...props
}) => {
    if (lg) {
        md = false;
        sm = false;
    }
    if (md) {
        sm = false;
    }
    if (!lg && !md && !sm) {
        md = true;
    }

    return (
        <Tag
            {...props}
            className={cx(className, styles.formControl, {
                [styles.formControlLg]: lg,
                [styles.formControlMd]: md,
                [styles.formControlSm]: sm,
            })}
        />
    );
};

FormControl.propTypes = propTypes;
FormControl.defaultProps = defaultProps;

export default FormControl;
