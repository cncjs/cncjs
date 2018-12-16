import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';

class RepeatButton extends PureComponent {
    static propTypes = {
        delay: PropTypes.number,
        throttle: PropTypes.number,
        onClick: PropTypes.func,
        children: PropTypes.node
    };

    actions = {
        handleHoldDown: () => {
            const delay = Number(this.props.delay) || 500;
            const throttle = Number(this.props.throttle) || 50;

            this.timeout = setTimeout(() => {
                this.actions.handleRelease();

                this.interval = setInterval(() => {
                    if (this.interval) {
                        this.props.onClick();
                    }
                }, throttle);
            }, delay);
        },
        handleRelease: () => {
            if (this.timeout) {
                clearTimeout(this.timeout);
                this.timeout = null;
            }
            if (this.interval) {
                clearInterval(this.interval);
                this.interval = null;
            }
        }
    };

    componentWillMount() {
        this.timeout = null;
        this.interval = null;
    }
    componentWillUnmount() {
        this.actions.handleRelease();
    }
    render() {
        const props = { ...this.props };

        delete props.delay;
        delete props.throttle;

        return (
            <button
                type="button"
                {...props}
                onMouseDown={this.actions.handleHoldDown}
                onMouseUp={this.actions.handleRelease}
                onMouseLeave={this.actions.handleRelease}
            />
        );
    }
}

export default RepeatButton;
