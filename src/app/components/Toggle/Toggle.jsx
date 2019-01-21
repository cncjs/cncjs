import chainedFunction from 'chained-function';
import ensureArray from 'ensure-array';
import PropTypes from 'prop-types';
import { Component } from 'react';

class Toggle extends Component {
    static propTypes = {
        defaultOn: PropTypes.bool,
        on: PropTypes.bool,
        onToggle: PropTypes.func,
        children: PropTypes.oneOfType([PropTypes.func, PropTypes.array]).isRequired,
    };

    static defaultProps = {
        defaultOn: false,
        onToggle: () => {},
    };

    toggleKeys = ['Enter', ' '] // This matches <button> behavior

    constructor(props) {
        super(props);

        this.state = this.getInitialState();
    }

    getInitialState() {
        return {
            on: this.getOn({
                on: this.props.defaultOn
            })
        };
    }

    getOn = (state = this.state) => {
        return (this.props.on !== undefined) ? !!(this.props.on) : !!(state.on);
    };

    getTogglerProps = (props) => {
        const { onClick, ...others } = { ...props };

        return {
            'aria-expanded': this.getOn(),
            tabIndex: 0,
            ...others,
            onClick: chainedFunction(onClick, this.toggle),
        };
    };

    getInputTogglerProps = (props) => {
        const { onKeyUp, ...others } = { ...props };

        return this.getTogglerProps({
            ...others,
            onKeyUp: chainedFunction(
                onKeyUp,
                (event) => {
                    if (event.key === 'Enter') {
                        this.toggle();
                    }
                }
            )
        });
    };

    getElementTogglerProps = (props) => {
        const { onKeyUp, ...others } = { ...props };

        return this.getTogglerProps({
            ...others,
            onKeyUp: chainedFunction(
                onKeyUp,
                (event) => {
                    if (this.toggleKeys.indexOf(event.key) >= 0) {
                        this.toggle();
                    }
                }
            )
        });
    };

    setOnState = (on) => {
        on = !!on;

        this.setState({ on }, () => {
            if (this.getOn() !== on) {
                this.props.onToggle(on, this.getTogglerStateAndHelpers());
            }
        });
    };

    setOn = () => this.setOnState(true);
    setOff = () => this.setOnState(false);
    toggle = () => this.setOnState(!this.getOn());

    getTogglerStateAndHelpers = () => ({
        on: this.getOn(),
        getTogglerProps: this.getTogglerProps,
        getInputTogglerProps: this.getInputTogglerProps,
        getElementTogglerProps: this.getElementTogglerProps,
        setOn: this.setOn,
        setOff: this.setOff,
        toggle: this.toggle,
    });

    componentDidUpdate(prevProps) {
        const isChanged = (prevProps.on !== this.props.on);
        const on = !!this.props.on;
        if (isChanged && (this.state.on !== on)) {
            this.setOnState(on);
        }
    }

    render() {
        const renderWithProps = ensureArray(this.props.children)[0];

        if (typeof renderProps === 'function') {
            return renderWithProps(this.getTogglerStateAndHelpers());
        }

        return null;
    }
}

export default Toggle;
