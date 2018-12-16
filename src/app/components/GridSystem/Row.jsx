import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import {
    LAYOUT_FLEXBOX,
    LAYOUT_FLOATS,
    LAYOUT_TABLE,
    LAYOUTS,
    DEFAULT_COLUMNS,
    DEFAULT_GUTTER_WIDTH,
    DEFAULT_LAYOUT
} from './constants';
import styles from './index.styl';

class Row extends PureComponent {
    static propTypes = {
        // The number of columns.
        columns: PropTypes.number,

        // The horizontal padding (called gutter) between two columns.
        gutterWidth: PropTypes.number,

        // The grid system layout.
        layout: PropTypes.oneOf(LAYOUTS)
    };

    static contextTypes = {
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
            marginLeft: -(gutterWidth / 2),
            marginRight: -(gutterWidth / 2)
        };

        return style;
    }

    render() {
        const {
            gutterWidth, // eslint-disable-line
            layout, // eslint-disable-line
            className,
            style,
            children,
            ...props
        } = this.props;

        return (
            <div
                {...props}
                className={cx(className, {
                    [styles.flexboxRow]: this.layout === LAYOUT_FLEXBOX,
                    [styles.floatsRow]: this.layout === LAYOUT_FLOATS,
                    [styles.tableRow]: this.layout === LAYOUT_TABLE
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

export default Row;
