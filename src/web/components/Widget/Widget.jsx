import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class Widget extends Component {
    static propTypes = {
        borderless: PropTypes.bool,
        fullscreen: PropTypes.bool
    };

    render() {
        const { borderless, fullscreen, ...props } = this.props;

        return (
            <div
                {...props}
                styleName={classNames(
                    'widget',
                    { 'widget-borderless': !!borderless },
                    { 'widget-fullscreen': !!fullscreen }
                )}
            />
        );
    }
}

export default Widget;
