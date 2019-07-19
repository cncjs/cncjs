import cx from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import FormControl from 'app/components/FormControl';
import Input from 'app/components/FormControl/Input';
import Select from 'app/components/FormControl/Select';
import Textarea from 'app/components/FormControl/Textarea';
import InputGroupPrepend from './InputGroupPrepend';
import InputGroupAppend from './InputGroupAppend';
import InputGroupText from './InputGroupText';
import * as sharedPropTypes from './shared/prop-types';
import styles from './index.styl';

const getComponentType = (Component) => (Component ? (<Component />).type : undefined);

const propTypes = {
    tag: sharedPropTypes.tag,
    lg: PropTypes.bool,
    md: PropTypes.bool,
    sm: PropTypes.bool,
};

const defaultProps = {
    tag: 'div',
};

const InputGroup = ({
    tag: Tag,
    lg,
    md,
    sm,
    className,
    children,
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
            className={cx(className, styles.inputGroup, {
                [styles.inputGroupLg]: lg,
                [styles.inputGroupMd]: md,
                [styles.inputGroupSm]: sm,
            })}
        >
            {React.Children.map(children, child => {
                if (React.isValidElement(child) && (
                    child.type === getComponentType(FormControl) ||
                    child.type === getComponentType(Input) ||
                    child.type === getComponentType(Select) ||
                    child.type === getComponentType(Textarea)
                )) {
                    const childProps = {};

                    childProps.lg = !!lg;
                    childProps.md = !!md;
                    childProps.sm = !!sm;

                    childProps.className = cx(childProps.className, styles.inputGroupItem);
                    return React.cloneElement(child, childProps);
                }
                return child;
            })}
        </Tag>
    );
};

InputGroup.propTypes = propTypes;
InputGroup.defaultProps = defaultProps;

InputGroup.Prepend = InputGroupPrepend;
InputGroup.Append = InputGroupAppend;
InputGroup.Text = InputGroupText;

export default InputGroup;
