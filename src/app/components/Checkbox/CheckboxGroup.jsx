import chainedFunction from 'chained-function';
import ensureArray from 'ensure-array';
import PropTypes from 'prop-types';
import React, { cloneElement, PureComponent } from 'react';
import Checkbox from './Checkbox';

const getComponentType = (Component) => (Component ? (<Component />).type : undefined);

class CheckboxGroup extends PureComponent {
    static propTypes = {
        /** If true, the checkbox group will be displayed as disabled. */
        disabled: PropTypes.bool,
        /** Name for the input element group. */
        name: PropTypes.string,
        /** The value of the checkbox group. */
        value: PropTypes.arrayOf(PropTypes.any),
        /** The default value of the checkbox group. */
        defaultValue: PropTypes.arrayOf(PropTypes.any),
        /** The callback function that is triggered when the value changes. */
        onChange: PropTypes.func,
        /** Limits the recursion depth when rendering checkboxes deeply inside a checkbox group. */
        depth: PropTypes.number
    };

    static defaultProps = {
        disabled: false,
        depth: 1
    };

    state = {
        value: ensureArray(this.props.value || this.props.defaultValue)
    };

    get value() {
        return this.state.value;
    }

    handleChange = (value, event) => {
        let newValue;
        if (event.target.checked) {
            newValue = this.state.value.concat(value);
        } else {
            newValue = this.state.value.filter(v => (v !== value));
        }

        if (this.props.value !== undefined) {
            // Controlled component
            this.setState({ value: ensureArray(this.props.value) });
        } else {
            // Uncontrolled component
            this.setState({ value: newValue });
        }

        if (typeof this.props.onChange === 'function') {
            this.props.onChange(newValue, event);
        }
    };

    renderChildren = (children, depth = 1) => {
        if (depth > this.props.depth) {
            return children;
        }

        const mapChild = (child) => {
            if (!React.isValidElement(child) || !child.props) {
                return child;
            }

            if (child.type === getComponentType(CheckboxGroup)) {
                // No nested checkbox groups
                return child;
            }

            if (child.type === getComponentType(Checkbox)) {
                return cloneElement(child, {
                    checked: this.state.value.indexOf(child.props.value) >= 0,
                    disabled: this.props.disabled || child.props.disabled,
                    onChange: chainedFunction(
                        child.props.onChange,
                        (event) => {
                            this.handleChange(child.props.value, event);
                        }
                    )
                });
            }

            if (child.props.children && typeof child.props.children === 'object') {
                return cloneElement(child, {
                    children: this.renderChildren(child.props.children, depth + 1)
                });
            }

            return child;
        };

        if (Array.isArray(children)) {
            return React.Children.map(children, mapChild);
        } else {
            return mapChild(children);
        }
    };

    componentWillReceiveProps(nextProps) {
        if (nextProps.value !== undefined) {
            this.setState({
                value: ensureArray(nextProps.value)
            });
        }
    }

    render() {
        return this.renderChildren(this.props.children);
    }
}

export default CheckboxGroup;
