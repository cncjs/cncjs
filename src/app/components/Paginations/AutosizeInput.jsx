//
// Forked from https://github.com/JedWatson/react-input-autosize
//
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';

const sizerStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    visibility: 'hidden',
    height: 0,
    overflow: 'scroll',
    whiteSpace: 'pre'
};

class AutosizeInput extends PureComponent {
    static propTypes = {
        // className for the outer element
        className: PropTypes.string,

        // default field value
        defaultValue: PropTypes.any,

        // className for the input element
        inputClassName: PropTypes.string,

        // css style for the input element
        inputStyle: PropTypes.object,

        // minimum width for input element
        minWidth: PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.string
        ]),

        // onAutosize handler: function(newWidth) {}
        onAutosize: PropTypes.func,

        // onChange handler: function(newValue) {}
        onChange: PropTypes.func,

        // placeholder text
        placeholder: PropTypes.string,

        // don't collapse size to less than the placeholder
        placeholderIsMinWidth: PropTypes.bool,

        // css styles fro the outer element
        style: PropTypes.object,

        // field value
        value: PropTypes.any
    };

    static defaultProps = {
        minWidth: 1
    };

    state = {
        inputWidth: this.props.minWidth
    };

    nodes = {
        input: null,
        sizer: null,
        placeholderSizer: null
    };

    _isMounted = false;

    componentDidMount() {
        this._isMounted = true;
        this.copyInputStyles();
        this.updateInputWidth();
    }

    componentWillUnmount() {
        this._isMounted = false;
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.inputWidth !== this.state.inputWidth) {
            if (typeof this.props.onAutosize === 'function') {
                this.props.onAutosize(this.state.inputWidth);
            }
        }
        this.updateInputWidth();
    }

    copyInputStyles() {
        if (!this._isMounted || !window.getComputedStyle) {
            return;
        }

        const inputStyle = window.getComputedStyle(this.nodes.input);
        if (!inputStyle) {
            return;
        }

        const widthNode = this.nodes.sizer;
        widthNode.style.fontSize = inputStyle.fontSize;
        widthNode.style.fontFamily = inputStyle.fontFamily;
        widthNode.style.fontWeight = inputStyle.fontWeight;
        widthNode.style.fontStyle = inputStyle.fontStyle;
        widthNode.style.letterSpacing = inputStyle.letterSpacing;

        if (this.props.placeholder) {
            const placeholderNode = this.nodes.placeholderSizer;
            placeholderNode.style.fontSize = inputStyle.fontSize;
            placeholderNode.style.fontFamily = inputStyle.fontFamily;
            placeholderNode.style.fontWeight = inputStyle.fontWeight;
            placeholderNode.style.fontStyle = inputStyle.fontStyle;
            placeholderNode.style.letterSpacing = inputStyle.letterSpacing;
        }
    }

    updateInputWidth() {
        if (!this._isMounted || typeof this.nodes.sizer.scrollWidth === 'undefined') {
            return;
        }
        let newInputWidth;
        if (this.props.placeholder && (!this.props.value || (this.props.value && this.props.placeholderIsMinWidth))) {
            newInputWidth = Math.max(this.nodes.sizer.scrollWidth, this.nodes.placeholderSizer.scrollWidth) + 2;
        } else {
            newInputWidth = this.nodes.sizer.scrollWidth + 2;
        }
        if (newInputWidth < this.props.minWidth) {
            newInputWidth = this.props.minWidth;
        }
        if (newInputWidth !== this.state.inputWidth) {
            this.setState({
                inputWidth: newInputWidth
            });
        }
    }

    getInput() {
        return this.nodes.input;
    }

    focus() {
        this.nodes.input.focus();
    }

    blur() {
        this.nodes.input.blur();
    }

    select() {
        this.nodes.input.select();
    }

    render() {
        const sizerValue = [this.props.defaultValue, this.props.value, ''].reduce((previousValue, currentValue) => {
            if (previousValue !== null && previousValue !== undefined) {
                return previousValue;
            }
            return currentValue;
        });

        const wrapperStyle = this.props.style || {};
        if (!wrapperStyle.display) {
            wrapperStyle.display = 'inline-block';
        }

        const inputStyle = { ...this.props.inputStyle };
        inputStyle.width = this.state.inputWidth + 'px';
        inputStyle.boxSizing = 'content-box';

        const inputProps = { ...this.props };
        inputProps.className = this.props.inputClassName;
        inputProps.style = inputStyle;

        // ensure props meant for `AutosizeInput` don't end up on the `input`
        delete inputProps.inputClassName;
        delete inputProps.inputStyle;
        delete inputProps.minWidth;
        delete inputProps.placeholderIsMinWidth;

        return (
            <div className={this.props.className} style={wrapperStyle}>
                <input
                    {...inputProps}
                    ref={node => {
                        this.nodes.input = node;
                    }}
                />
                <div
                    ref={node => {
                        this.nodes.sizer = node;
                    }}
                    style={sizerStyle}
                >
                    {sizerValue}
                </div>
                {this.props.placeholder && (
                    <div
                        ref={node => {
                            this.nodes.placeholderSizer = node;
                        }}
                        style={sizerStyle}
                    >
                        {this.props.placeholder}
                    </div>
                )}
            </div>
        );
    }
}

export default AutosizeInput;
