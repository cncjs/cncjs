import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import {
    LAYOUT_FLEXBOX,
    LAYOUT_FLOATS,
    SCREEN_CLASSES,
} from './constants';
import Resolver from './Resolver';
import styles from './index.styl';

const flexboxAutoprefixer = (style) => Object.keys(style).reduce((obj, key) => {
    const val = style[key];

    if (key === 'flex') {
        // flex: 1 0 50%;
        style.WebkitBoxFlex = parseInt(val, 10); // -webkit-box-flex
        style.WebkitFlex = val; // -webkit-flex
        style.msFlex = val; // -ms-flex
    } else if (key === 'flexBasis') {
        style.WebkitFlexBasis = val; // -webkit-flex-basis;
        style.msFlexPreferredSize = val; // -ms-flex-preferred-size
    } else if (key === 'flexGrow') {
        style.WebkitBoxFlex = val; // -webkit-box-flex
        style.WebkitFlexGrow = val; // -webkit-flex-grow
        style.msFlexPositive = val; // -ms-flex-positive
    } if (key === 'flexShrink') {
        obj.WebkitFlexShrink = val; // -webkit-flex-shrink
        obj.msFlexNegative = val; // -ms-flex-negative
    }

    obj[key] = val;

    return obj;
}, {});

const getWidth = (width, columns) => {
    if (width === 'auto') {
        return width;
    }

    width = parseInt(width, 10);

    if (Number.isNaN(width)) {
        return undefined;
    }

    columns = Math.floor(columns);
    if (columns <= 0) {
        columns = 1;
    }

    const colWidth = Math.max(0, Math.min(columns, width));
    if (colWidth === columns) {
        return '100%';
    }
    return `${((100 / columns) * colWidth).toFixed(8) * 1}%`;
};

class Col extends Component {
    static propTypes = {
        // The width of the column for all screen classes.
        width: PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.string
        ]),

        // The width of the column for screen class `xs`.
        xs: PropTypes.oneOfType([
            PropTypes.bool,
            PropTypes.number,
            PropTypes.string
        ]),

        // The width of the column for screen class `sm`.
        sm: PropTypes.oneOfType([
            PropTypes.bool,
            PropTypes.number,
            PropTypes.string
        ]),

        // The width of the column for screen class `md`.
        md: PropTypes.oneOfType([
            PropTypes.bool,
            PropTypes.number,
            PropTypes.string
        ]),

        // The width of the column for screen class `lg`.
        lg: PropTypes.oneOfType([
            PropTypes.bool,
            PropTypes.number,
            PropTypes.string
        ]),

        // The width of the column for screen class `xl`.
        xl: PropTypes.oneOfType([
            PropTypes.bool,
            PropTypes.number,
            PropTypes.string
        ]),

        // The width of the column for screen class `xxl`.
        xxl: PropTypes.oneOfType([
            PropTypes.bool,
            PropTypes.number,
            PropTypes.string
        ]),

        // The offset of this column for all screen classes.
        offset: PropTypes.shape({
            xs: PropTypes.number,
            sm: PropTypes.number,
            md: PropTypes.number,
            lg: PropTypes.number,
            xl: PropTypes.number,
            xxl: PropTypes.number
        }),

        // The amount this column is pulled to the left for all screen classes.
        pull: PropTypes.shape({
            xs: PropTypes.number,
            sm: PropTypes.number,
            md: PropTypes.number,
            lg: PropTypes.number,
            xl: PropTypes.number,
            xxl: PropTypes.number
        }),

        // The amount this column is pushed to the right for all screen classes.
        push: PropTypes.shape({
            xs: PropTypes.number,
            sm: PropTypes.number,
            md: PropTypes.number,
            lg: PropTypes.number,
            xl: PropTypes.number,
            xxl: PropTypes.number
        })
    };

    static defaultProps = {
        offset: {},
        push: {},
        pull: {}
    };

    getFloatsStyle = ({ columns, gutterWidth, screenClass }) => {
        const style = {
            boxSizing: 'border-box',
            paddingLeft: gutterWidth / 2,
            paddingRight: gutterWidth / 2,
        };

        if (this.props.width) {
            style.width = getWidth(this.props.width, columns) || style.width;
        }

        const width = {
            xs: this.props.xs,
            sm: this.props.sm,
            md: this.props.md,
            lg: this.props.lg,
            xl: this.props.xl,
            xxl: this.props.xxl
        };
        const { offset, push, pull } = this.props;
        const screenClasses = SCREEN_CLASSES;
        screenClasses.forEach((size, index) => {
            if (screenClasses.indexOf(screenClass) < index) {
                return;
            }

            style.width = getWidth(width[size], columns) || style.width;
            style.marginLeft = getWidth(offset[size], columns) || style.marginLeft;
            style.left = getWidth(push[size], columns) || style.left;
            style.right = getWidth(pull[size], columns) || style.right;
        });

        return style;
    };

    getFlexboxStyle = ({ columns, gutterWidth, screenClass }) => {
        const style = {
            boxSizing: 'border-box',
            paddingLeft: gutterWidth / 2,
            paddingRight: gutterWidth / 2,
            flexShrink: 0,
        };

        // <Col width={6}>col</Col>
        if (this.props.width) {
            if (this.props.width === 'auto') {
                style.flexBasis = 'auto';
                style.flexGrow = 0;
                style.width = 'auto';
                style.maxWidth = 'none';
            } else {
                style.flexBasis = getWidth(this.props.width, columns) || style.flexBasis;
                style.maxWidth = getWidth(this.props.width, columns) || style.maxWidth;
            }
        }

        const width = {
            xs: this.props.xs,
            sm: this.props.sm,
            md: this.props.md,
            lg: this.props.lg,
            xl: this.props.xl,
            xxl: this.props.xxl
        };
        const { offset, push, pull } = this.props;
        const screenClasses = SCREEN_CLASSES;
        screenClasses.forEach((size, index) => {
            if (screenClasses.indexOf(screenClass) < index) {
                return;
            }

            if (width[size] === true) {
                // <Col sm>col</Col>
                style.flexBasis = 0;
                style.flexGrow = 1;
            } else if (width[size] === 'auto') {
                style.flexBasis = 'auto';
                style.flexGrow = 0;
                style.width = 'auto';
            } else {
                style.flexBasis = getWidth(width[size], columns) || style.flexBasis;
                style.maxWidth = getWidth(width[size], columns) || style.maxWidth;
            }
            style.marginLeft = getWidth(offset[size], columns) || style.marginLeft;
            style.left = getWidth(push[size], columns) || style.left;
            style.right = getWidth(pull[size], columns) || style.right;
        });

        const hasWidth = !!getWidth(this.props.width) || Object.keys(width).reduce((acc, cur) => acc || width[cur], false);
        if (!hasWidth) {
            style.flexBasis = 0;
            style.flexGrow = 1;
            style.maxWidth = '100%';
        }

        return flexboxAutoprefixer(style);
    };

    render() {
        const {
            width, xs, sm, md, lg, xl, xxl, // eslint-disable-line
            offset, pull, push, // eslint-disable-line
            className,
            style,
            children,
            ...props
        } = this.props;

        return (
            <Resolver>
                {({ config, screenClass }) => {
                    const { columns, gutterWidth, layout } = config;
                    let colStyle = {};
                    if (layout === LAYOUT_FLEXBOX) {
                        colStyle = this.getFlexboxStyle({ columns, gutterWidth, screenClass });
                    }
                    if (layout === LAYOUT_FLOATS) {
                        colStyle = this.getFloatsStyle({ columns, gutterWidth, screenClass });
                    }

                    return (
                        <div
                            {...props}
                            className={cx(className, {
                                [styles.flexboxCol]: layout === LAYOUT_FLEXBOX,
                                [styles.floatsCol]: layout === LAYOUT_FLOATS
                            })}
                            style={{
                                ...colStyle,
                                ...style
                            }}
                        >
                            {children}
                        </div>
                    );
                }}
            </Resolver>
        );
    }
}

export default Col;
