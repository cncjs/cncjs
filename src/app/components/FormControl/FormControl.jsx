import cx from 'classnames';
import React from 'react';
import * as sharedPropTypes from './shared/prop-types';
import styles from './index.styl';

const propTypes = {
    tag: sharedPropTypes.tag,
    fcSize: sharedPropTypes.fcSize,
};

const defaultProps = {
    tag: 'div',
    fcSize: 'md',
};

const FormControl = ({
    className,
    fcSize,
    tag: Tag,
    ...props
}) => (
    <Tag
        {...props}
        className={cx(className, styles.formControl, {
            [styles.formControlLg]: fcSize === 'lg' || fcSize === 'large',
            [styles.formControlMd]: !fcSize || fcSize === 'md' || fcSize === 'medium',
            [styles.formControlSm]: fcSize === 'sm' || fcSize === 'small',
        })}
    />
);

FormControl.propTypes = propTypes;
FormControl.defaultProps = defaultProps;

export default FormControl;
