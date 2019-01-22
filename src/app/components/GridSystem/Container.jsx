import cx from 'classnames';
import ensureArray from 'ensure-array';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import {
    LAYOUT_FLEXBOX,
    LAYOUT_FLOATS,
    LAYOUTS,
    DEFAULT_CONTAINER_WIDTHS,
    DEFAULT_COLUMNS,
    DEFAULT_GUTTER_WIDTH,
    DEFAULT_LAYOUT,
} from './constants';
import Resolver from './Resolver';
import { ConfigurationContext } from './context';
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

    getStyle = ({ containerWidths, gutterWidth, screenClass }) => {
        const style = {
            paddingLeft: gutterWidth / 2,
            paddingRight: gutterWidth / 2
        };

        const { fluid, xs, sm, md, lg, xl, xxl } = this.props;
        if (fluid && (!sm && !md && !lg && !xl && !xxl)) {
            return style;
        }

        containerWidths = ensureArray(containerWidths);

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
    };

    render() {
        const {
            fluid, // eslint-disable-line
            xs, sm, md, lg, xl, xxl, // eslint-disable-line
            columns: _columns, // eslint-disable-line
            gutterWidth: _gutterWidth, // eslint-disable-line
            layout: _layout, // eslint-disable-line
            className,
            style,
            children,
            ...props
        } = this.props;

        return (
            <Resolver>
                {({ config, screenClass }) => {
                    config = { ...config };
                    const containerWidths = (() => {
                        const containerWidths = ensureArray(config.containerWidths);
                        return containerWidths.length > 0 ? containerWidths : DEFAULT_CONTAINER_WIDTHS;
                    })();
                    const columns = (() => {
                        const { columns = config.columns } = this.props;
                        return Number(columns) > 0 ? Number(columns) : DEFAULT_COLUMNS;
                    })();
                    const gutterWidth = (() => {
                        const { gutterWidth = config.gutterWidth } = this.props;
                        return Number(gutterWidth) >= 0 ? (Number(gutterWidth) || 0) : DEFAULT_GUTTER_WIDTH;
                    })();
                    const layout = (() => {
                        const { layout = config.layout } = this.props;
                        return (LAYOUTS.indexOf(layout) >= 0) ? layout : DEFAULT_LAYOUT;
                    })();
                    const containerStyle = this.getStyle({ containerWidths, gutterWidth, screenClass });

                    return (
                        <ConfigurationContext.Provider
                            value={{
                                ...config,
                                containerWidths,
                                columns,
                                gutterWidth,
                                layout,
                            }}
                        >
                            <div
                                {...props}
                                className={cx(className, {
                                    [styles.flexboxContainer]: layout === LAYOUT_FLEXBOX,
                                    [styles.floatsContainer]: layout === LAYOUT_FLOATS,
                                })}
                                style={{
                                    ...containerStyle,
                                    ...style,
                                }}
                            >
                                {children}
                            </div>
                        </ConfigurationContext.Provider>
                    );
                }}
            </Resolver>
        );
    }
}

export default Container;
