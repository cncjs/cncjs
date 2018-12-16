import chainedFunction from 'chained-function';
import React, { cloneElement, PureComponent } from 'react';
import PropTypes from 'prop-types';
import RadioButton from './RadioButton';

const getComponentType = (Component) => (Component ? (<Component />).type : undefined);

class RadioGroup extends PureComponent {
    static propTypes = {
        disabled: PropTypes.bool,
        name: PropTypes.string,
        value: PropTypes.any,
        defaultValue: PropTypes.any,
        onChange: PropTypes.func,
        depth: PropTypes.number
    };

    static defaultProps = {
        disabled: false,
        depth: 1
    };

    state = {
        value: (this.props.value !== undefined) ? this.props.value : this.props.defaultValue
    };

    get value() {
        return this.state.value;
    }

    handleChange = (value, event) => {
        if (this.props.value !== undefined) {
            // Controlled component
            this.setState({ value: this.props.value });
        } else {
            // Uncontrolled component
            this.setState({ value: value });
        }

        if (typeof this.props.onChange === 'function') {
            this.props.onChange(value, event);
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

            if (child.type === getComponentType(RadioGroup)) {
                // No nested radio groups
                return child;
            }

            if (child.type === getComponentType(RadioButton)) {
                return cloneElement(child, {
                    checked: (this.state.value !== undefined) && (this.state.value === child.props.value),
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
                value: nextProps.value
            });
        }
    }

    render() {
        return this.renderChildren(this.props.children);
    }
}

export default RadioGroup;
