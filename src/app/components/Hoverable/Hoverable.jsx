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
        return (
            <div
                onMouseEnter={this.handleMouseEnter}
                onMouseLeave={this.handleMouseLeave}
            >
                {typeof this.props.children === 'function'
                    ? this.props.children(this.state.hovered)
                    : this.porps.children
                }
            </div>
        );
    }
}

export default Hoverable;
