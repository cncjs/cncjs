import PropTypes from 'prop-types';
import React from 'react';
import {
    DEFAULT_BREAKPOINTS,
    DEFAULT_CONTAINER_WIDTHS,
    DEFAULT_COLUMNS,
    DEFAULT_GUTTER_WIDTH
} from './constants';

class Provider extends React.Component {
    static propTypes = {
        // The breakpoints (minimum width) of devices in screen class sm, md, lg, xl, and xxl.
        breakpoints: PropTypes.arrayOf(PropTypes.number),

        // The container widths in pixels of devices in screen class sm, md, lg, xl, and xxl.
        containerWidths: PropTypes.arrayOf(PropTypes.number),

        // The number of columns. Defaults to 12.
        columns: PropTypes.number,

        // The horizontal padding (called gutter) between two columns. A gutter width of 30 means 15px on each side of a column.
        gutterWidth: PropTypes.number,

        // The grid system layout. One of: 'floats', 'flexbox'
        layout: PropTypes.oneOf(['floats', 'flexbox'])
    };

    static defaultProps = {
        breakpoints: DEFAULT_BREAKPOINTS,
        containerWidths: DEFAULT_CONTAINER_WIDTHS,
        columns: DEFAULT_COLUMNS,
        gutterWidth: DEFAULT_GUTTER_WIDTH,
        layout: 'floats'
    };

    static childContextTypes = {
        breakpoints: PropTypes.arrayOf(PropTypes.number),
        containerWidths: PropTypes.arrayOf(PropTypes.number),
        columns: PropTypes.number,
        gutterWidth: PropTypes.number,
        layout: PropTypes.oneOf(['floats', 'flexbox'])
    };

    getChildContext = () => ({
        breakpoints: this.props.breakpoints,
        containerWidths: this.props.containerWidths,
        columns: this.props.columns,
        gutterWidth: this.props.gutterWidth,
        layout: this.props.layout
    });

    render() {
        return this.props.children;
    }
}

export default Provider;
