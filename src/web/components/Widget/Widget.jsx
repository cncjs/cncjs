import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import styles from './index.styl';

class Widget extends Component {
    static propTypes = {
        borderless: PropTypes.bool,
        fullscreen: PropTypes.bool
    };
    static defaultProps = {
        borderless: false,
        fullscreen: false
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { borderless, fullscreen, className, ...props } = this.props;

        return (
            <div
                {...props}
                className={classNames(
                    className,
                    styles.widget,
                    { [styles.widgetBorderless]: borderless },
                    { [styles.widgetFullscreen]: fullscreen }
                )}
            />
        );
    }
}

export default Widget;
