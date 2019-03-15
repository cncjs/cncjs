import ensureArray from 'ensure-array';
import _throttle from 'lodash/throttle';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import {
    LAYOUTS,
    SCREEN_CLASSES,
    DEFAULT_BREAKPOINTS,
    DEFAULT_CONTAINER_WIDTHS,
    DEFAULT_COLUMNS,
    DEFAULT_GUTTER_WIDTH,
    DEFAULT_LAYOUT,
} from './constants';
import { ConfigurationContext, ScreenClassContext } from './context';
import { getScreenClass } from './utils';

class Provider extends PureComponent {
    static propTypes = {
        // The breakpoints (minimum width) of devices in screen class sm, md, lg, xl, and xxl.
        breakpoints: PropTypes.arrayOf(PropTypes.number),

        // The container widths in pixels of devices in screen class sm, md, lg, xl, and xxl.
        containerWidths: PropTypes.arrayOf(PropTypes.number),

        // The number of columns. Defaults to 12.
        columns: PropTypes.number,

        // The horizontal padding (called gutter) between two columns. A gutter width of 30 means 15px on each side of a column.
        gutterWidth: PropTypes.number,

        // The grid system layout. One of: 'flexbox', 'floats'
        layout: PropTypes.oneOf(LAYOUTS),

        // A callback invoked when the resize event occurs.
        onResize: PropTypes.func,
    };

    static defaultProps = {
        breakpoints: DEFAULT_BREAKPOINTS,
        containerWidths: DEFAULT_CONTAINER_WIDTHS,
        columns: DEFAULT_COLUMNS,
        gutterWidth: DEFAULT_GUTTER_WIDTH,
        layout: DEFAULT_LAYOUT,
        onResize: () => {},
    };

    constructor(props) {
        super(props);

        this.state = {
            screenClass: SCREEN_CLASSES[0]
        };
    }

    componentDidMount() {
        this.setScreenClass();

        this.eventListener = _throttle(this.setScreenClass, Math.floor(1000 / 60)); // 60Hz
        window.addEventListener('resize', this.eventListener);
    }

    componentWillUnmount() {
        if (this.eventListener) {
            this.eventListener.cancel();
            window.removeEventListener('resize', this.eventListener);
            this.eventListener = null;
        }
    }

    setScreenClass = () => {
        const { breakpoints } = this.props;
        const screenClass = getScreenClass({ breakpoints });
        if (screenClass !== this.state.screenClass) {
            this.setState({ screenClass: screenClass });
        }
    };

    render() {
        const breakpoints = (() => {
            const breakpoints = ensureArray(this.props.breakpoints);
            return breakpoints.length > 0 ? breakpoints : DEFAULT_BREAKPOINTS;
        })();
        const containerWidths = (() => {
            const containerWidths = ensureArray(this.props.containerWidths);
            return containerWidths.length > 0 ? containerWidths : DEFAULT_CONTAINER_WIDTHS;
        })();
        const columns = (() => {
            const columns = Number(this.props.columns) || 0;
            return columns > 0 ? columns : DEFAULT_COLUMNS;
        })();
        const gutterWidth = (() => {
            const gutterWidth = Number(this.props.gutterWidth) || 0;
            return gutterWidth >= 0 ? gutterWidth : DEFAULT_GUTTER_WIDTH;
        })();
        const layout = (() => {
            const layout = this.props.layout;
            return (LAYOUTS.indexOf(layout) >= 0) ? layout : DEFAULT_LAYOUT;
        })();
        const { screenClass } = this.state;

        return (
            <ConfigurationContext.Provider
                value={{
                    breakpoints,
                    containerWidths,
                    columns,
                    gutterWidth,
                    layout,
                }}
            >
                <ScreenClassContext.Provider value={screenClass}>
                    <React.Fragment>
                        {this.props.children}
                    </React.Fragment>
                </ScreenClassContext.Provider>
            </ConfigurationContext.Provider>
        );
    }
}

export default Provider;
