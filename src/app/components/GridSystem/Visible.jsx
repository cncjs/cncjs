import PropTypes from 'prop-types';
import { PureComponent } from 'react';
import throttle from 'lodash/throttle';
import { getScreenClass } from './utils';

const visible = (screenClass, { xs, sm, md, lg, xl, xxl }) => {
    if (screenClass === 'xxl') {
        return !!xxl;
    }
    if (screenClass === 'xl') {
        return !!xl;
    }
    if (screenClass === 'lg') {
        return !!lg;
    }
    if (screenClass === 'md') {
        return !!md;
    }
    if (screenClass === 'sm') {
        return !!sm;
    }
    if (screenClass === 'xs') {
        return !!xs;
    }
    return true; // Defaults to true
};

class Visible extends PureComponent {
    static propTypes = {
        // Visible on extra small devices.
        xs: PropTypes.bool,

        // Visible on small devices.
        sm: PropTypes.bool,

        // Visible on medimum devices.
        md: PropTypes.bool,

        // Visible on large devices.
        lg: PropTypes.bool,

        // Visible on extra large devices.
        xl: PropTypes.bool,

        // Visible on double extra large devices.
        xxl: PropTypes.bool,

        // A callback fired when the resize event occurs.
        onResize: PropTypes.func
    };

    static defaultProps = {
        xs: false,
        sm: false,
        md: false,
        lg: false,
        xl: false,
        xxl: false
    };

    static contextTypes = {
        breakpoints: PropTypes.arrayOf(PropTypes.number)
    };

    setScreenClass = () => {
        const screenClass = getScreenClass({ breakpoints: this.context.breakpoints });

        this.setState({ screenClass: screenClass }, () => {
            if (typeof this.props.onResize === 'function') {
                this.props.onResize({ screenClass: screenClass });
            }
        });
    };

    componentWillMount() {
        this.setScreenClass();
    }

    componentDidMount() {
        this.eventListener = throttle(this.setScreenClass, Math.floor(1000 / 60)); // 60Hz
        window.addEventListener('resize', this.eventListener);
    }

    componentWillUnmount() {
        if (this.eventListener) {
            this.eventListener.cancel();
            window.removeEventListener('resize', this.eventListener);
            this.eventListener = null;
        }
    }

    render() {
        const {
            xs, sm, md, lg, xl, xxl, // eslint-disable-line
            onResize // eslint-disable-line
        } = this.props;

        if (visible(this.state.screenClass, { xs, sm, md, lg, xl, xxl })) {
            return this.props.children;
        }

        return null;
    }
}

export default Visible;
