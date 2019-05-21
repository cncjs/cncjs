import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

class Blink extends PureComponent {
    static propTypes = {
        children: PropTypes.node.isRequired,

        // Half-period in milliseconds used for blinking. The default blink rate is 530ms. By setting this to zero, blinking can be disabled.
        rate: PropTypes.number
    };

    static defaultProps = {
        rate: 530
    };

    state = {
        visible: true
    };

    blinkTimer = null;

    blink = () => {
        if (this.blinkTimer) {
            clearInterval(this.blinkTimer);
            this.blinkTimer = null;
        }

        if (this.props.rate > 0) {
            this.blinkTimer = setInterval(() => {
                this.setState(state => ({
                    visible: !state.visible
                }));
            }, this.props.rate);
        } else {
            this.setState(state => ({
                visible: true
            }));
        }
    };

    componentDidMount() {
        this.blink();
    }

    componentDidUpdate() {
        this.blink();
    }

    componentWillUnmount() {
        if (this.blinkTimer) {
            clearInterval(this.blinkTimer);
            this.blinkTimer = null;
        }
    }

    render() {
        const {
            rate, // eslint-disable-line no-unused-vars
            ...props
        } = this.props;

        props.style = {
            ...props.style,
            visibility: this.state.visible ? 'visible' : 'hidden'
        };

        return (
            <span {...props} />
        );
    }
}

export default Blink;
