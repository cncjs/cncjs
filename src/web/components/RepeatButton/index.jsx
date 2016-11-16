import React, { Component, PropTypes } from 'react';

class RepeatButton extends Component {
    static propTypes = {
        delay: PropTypes.number,
        throttle: PropTypes.number,
        onClick: PropTypes.func,
        children: PropTypes.node
    };

    componentWillMount() {
        this.timeout = null;
        this.interval = null;
    }
    componentWillUnmount() {
        this.handleRelease();
    }
    handleHoldDown() {
        const delay = Number(this.props.delay) || 500;
        const throttle = Number(this.props.throttle) || 50;

        this.timeout = setTimeout(() => {
            this.handleRelease();

            this.interval = setInterval(() => {
                if (this.interval) {
                    this.props.onClick();
                }
            }, throttle);
        }, delay);
    }
    handleRelease() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
    render() {
        return (
            <button
                type="button"
                {...this.props}
                onMouseDown={::this.handleHoldDown}
                onMouseUp={::this.handleRelease}
                onMouseLeave={::this.handleRelease}
            >
                {this.props.children}
            </button>
        );
    }
}

export default RepeatButton;
