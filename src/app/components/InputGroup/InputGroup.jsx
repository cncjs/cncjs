import cx from 'classnames';
import React from 'react';
import FormControl from 'app/components/FormControl';
import Input from 'app/components/FormControl/Input';
import Select from 'app/components/FormControl/Select';
import Textarea from 'app/components/FormControl/Textarea';
import InputGroupPrepend from './InputGroupPrepend';
import InputGroupAppend from './InputGroupAppend';
import InputGroupText from './InputGroupText';
import styles from './index.styl';

const sizes = [
    'lg',
    'sm',
    'large',
    'small',
];

const getComponentType = (Component) => (Component ? (<Component />).type : undefined);

const InputGroup = ({
    tag: Component = 'div',
    size,
    className,
    children,
    ...props
}) => (
    <Component
        {...props}
        className={cx(className, styles.inputGroup, {
            [styles.inputGroupLg]: size === 'lg' || size === 'large',
            [styles.inputGroupSm]: size === 'sm' || size === 'small',
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
                if (sizes.indexOf(size)) {
                    childProps.size = size;
                }

                childProps.className = cx(childProps.className, styles.inputGroupItem);
                return React.cloneElement(child, childProps);
            }
            return child;
        })}
    </Component>
);

InputGroup.Prepend = InputGroupPrepend;
InputGroup.Append = InputGroupAppend;
InputGroup.Text = InputGroupText;

export default InputGroup;
