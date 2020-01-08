import React from 'react';
import PropTypes from 'prop-types';
import { RadioGroupContext } from './context';

class RadioGroup extends React.Component {
    static propTypes = {
        disabled: PropTypes.bool,
        name: PropTypes.string,
        value: PropTypes.any,
        defaultValue: PropTypes.any,
        onChange: PropTypes.func,
    };

    static defaultProps = {
        disabled: false,
    };

    static getDerivedStateFromProps(nextProps, prevState) {
        let updatedState = null;
        if (nextProps.value !== undefined && nextProps.value !== prevState.value) {
            // Controlled component, value is controlled by parent
            updatedState = {
                ...updatedState,
                value: nextProps.value
            };
        }
        if (nextProps.disabled !== undefined && nextProps.disabled !== prevState.disabled) {
            updatedState = {
                ...updatedState,
                disabled: nextProps.disabled
            };
        }

        return updatedState;
    }

    handleChange = (event) => {
        if (this.props.value !== undefined) {
            // Controlled component
            const value = this.props.value;
            this.setState({ value });
        } else {
            // Uncontrolled component
            const value = event.target.value;
            this.setState({ value });
        }

        if (typeof this.props.onChange === 'function') {
            this.props.onChange(event);
        }
    };

    state = {
        value: (this.props.value !== undefined) ? this.props.value : this.props.defaultValue,
        disabled: (this.props.disabled !== undefined) ? this.props.disabled : false,
        onChange: this.handleChange,
    };

    render() {
        return (
            <RadioGroupContext.Provider value={this.state}>
                {this.props.children}
            </RadioGroupContext.Provider>
        );
    }
}

export default RadioGroup;
