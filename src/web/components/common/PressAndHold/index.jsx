import React from 'react';

class PressAndHold extends React.Component {
    componentWillMount() {
        this.timeout = null;
        this.interval = null;
    }
    componentWillUnmount() {
        this.handleRelease();
    }
    handleHoldDown() {
        let that = this;
        let delay = Number(this.props.delay) || 500;
        let throttle = Number(this.props.throttle) || 50;

        this.timeout = setTimeout(function() {
            that.handleRelease();

            that.interval = setInterval(function() {
                if (that.interval) {
                    that.props.onClick();
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
            <div
                {...this.props}
                onMouseDown={::this.handleHoldDown}
                onMouseUp={::this.handleRelease}
                onMouseLeave={::this.handleRelease}
            >
                {this.props.children}
            </div>
        );
    }
}

export default PressAndHold;
