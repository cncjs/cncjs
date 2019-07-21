import chainedFunction from 'chained-function';
import React, { Component } from 'react';

class Hoverable extends Component {
    state = {
        hovered: false
    };

    handleMouseEnter = () => {
        this.setState({ hovered: true });
    };

    handleMouseLeave = () => {
        this.setState({ hovered: false });
    };

    render() {
        const { onMouseEnter, onMouseLeave, children, style, ...props } = this.props;

        return (
            <div
                {...props}
                style={{
                    display: 'inline-block',
                    ...style
                }}
                onMouseEnter={chainedFunction(this.handleMouseEnter, onMouseEnter)}
                onMouseLeave={chainedFunction(this.handleMouseLeave, onMouseLeave)}
            >
                {typeof children === 'function'
                    ? children({ disabled: this.props.disabled, hovered: this.state.hovered })
                    : children
                }
            </div>
        );
    }
}

export default Hoverable;
