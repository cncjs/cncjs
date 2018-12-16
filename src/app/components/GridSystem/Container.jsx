import cx from 'classnames';
import ensureArray from 'ensure-array';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import throttle from 'lodash/throttle';
import { getScreenClass } from './utils';
import {
    LAYOUT_TABLE,
    LAYOUT_FLEXBOX,
    LAYOUT_FLOATS,
    LAYOUTS,
    DEFAULT_CONTAINER_WIDTHS,
    DEFAULT_COLUMNS,
    DEFAULT_GUTTER_WIDTH,
    DEFAULT_LAYOUT
} from './constants';
import styles from './index.styl';

class Container extends PureComponent {
    static propTypes = {
        // True makes the container full-width, false fixed-width.
        fluid: PropTypes.bool,

        // This is in combination with fluid enabled.
        // True makes container fluid only in xs, not present means fluid everywhere.
        xs: PropTypes.bool,

        // This is in combination with fluid enabled.
        // True makes container fluid only in sm, not present means fluid everywhere.
        sm: PropTypes.bool,

        // This is in combination with fluid enabled.
        // True makes container fluid only in md, not present means fluid everywhere.
        md: PropTypes.bool,

        // This is in combination with fluid enabled.
        // True makes container fluid only in lg, not present means fluid everywhere.
        lg: PropTypes.bool,

        // This is in combination with fluid enabled.
        // True makes container fluid only in xl, not present means fluid everywhere.
        xl: PropTypes.bool,

        // This is in combination with fluid enabled.
        // True makes container fluid only in xxl, not present means fluid everywhere.
        xxl: PropTypes.bool,

        // The number of columns.
        columns: PropTypes.number,

        // The horizontal padding (called gutter) between two columns.
        gutterWidth: PropTypes.number,

        // The grid system layout.
        layout: PropTypes.oneOf(LAYOUTS),

        // A callback fired when the resize event occurs.
        onResize: PropTypes.func
    };

    static defaultProps = {
        fluid: false,
        xs: false,
        sm: false,
        md: false,
        lg: false,
        xl: false,
        xxl: false
    };

    static contextTypes = {
        breakpoints: PropTypes.arrayOf(PropTypes.number),
        containerWidths: PropTypes.arrayOf(PropTypes.number),
        columns: PropTypes.number,
        gutterWidth: PropTypes.number,
        layout: PropTypes.oneOf(LAYOUTS)
    };

    static childContextTypes = {
        columns: PropTypes.number,
        gutterWidth: PropTypes.number,
        layout: PropTypes.oneOf(LAYOUTS)
    };

    getChildContext = () => ({
        columns: this.columns,
        gutterWidth: this.gutterWidth,
        layout: this.layout
    });

    get columns() {
        if (this.props.columns > 0) {
            return this.props.columns;
        }
        if (this.context.columns > 0) {
            return this.context.columns;
        }
        return DEFAULT_COLUMNS;
    }

    get gutterWidth() {
        if (this.props.gutterWidth >= 0) {
            return this.props.gutterWidth;
        }
        if (this.context.gutterWidth >= 0) {
            return this.context.gutterWidth;
        }
        return DEFAULT_GUTTER_WIDTH;
    }

    get layout() {
        const layout = this.props.layout || this.context.layout;
        return (LAYOUTS.indexOf(layout) >= 0) ? layout : DEFAULT_LAYOUT;
    }

    get style() {
        const gutterWidth = this.gutterWidth;
        const style = {
            paddingLeft: gutterWidth / 2,
            paddingRight: gutterWidth / 2
        };

        const { fluid, xs, sm, md, lg, xl, xxl } = this.props;
        if (fluid && (!sm && !md && !lg && !xl && !xxl)) {
            return style;
        }

        const { screenClass } = this.state;
        const containerWidths = (ensureArray(this.context.containerWidths).length > 0)
            ? ensureArray(this.context.containerWidths)
            : DEFAULT_CONTAINER_WIDTHS;

        if (screenClass === 'sm' && (containerWidths[0] > 0) && (!sm && !xs)) {
            style.maxWidth = `${containerWidths[0]}px`;
        }
        if (screenClass === 'md' && (containerWidths[1] > 0) && !md) {
            style.maxWidth = `${containerWidths[1]}px`;
        }
        if (screenClass === 'lg' && (containerWidths[2] > 0) && !lg) {
            style.maxWidth = `${containerWidths[2]}px`;
        }
        if (screenClass === 'xl' && (containerWidths[3] > 0) && !xl) {
            style.maxWidth = `${containerWidths[3]}px`;
        }
        if (screenClass === 'xxl' && (containerWidths[4] > 0) && !xxl) {
            style.maxWidth = `${containerWidths[4]}px`;
        }

        return style;
    }

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
            fluid, // eslint-disable-line
            xs, sm, md, lg, xl, xxl, // eslint-disable-line
            gutterWidth, // eslint-disable-line
            layout, // eslint-disable-line
            onResize, // eslint-disable-line
            className,
            style,
            children,
            ...props
        } = this.props;

        return (
            <div
                {...props}
                className={cx(className, {
                    [styles.flexboxContainer]: this.layout === LAYOUT_FLEXBOX,
                    [styles.floatsContainer]: this.layout === LAYOUT_FLOATS,
                    [styles.tableContainer]: this.layout === LAYOUT_TABLE
                })}
                style={{
                    ...this.style,
                    ...style
                }}
            >
                {children}
            </div>
        );
    }
}

export default Container;
