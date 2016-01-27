import classNames from 'classnames';
import React from 'react';

class Widget extends React.Component {
    render() {
        let { borderless, fullscreen } = this.props;
        let widgetClass = classNames(
            'widget',
            { 'widget-borderless': !!borderless },
            { 'widget-fullscreen': !!fullscreen }
        );

        return (
            <div {...this.props} data-component="Widget">
                <div className={widgetClass}>
                    {this.props.children}
                </div>
            </div>
        );
    }
}

export default Widget;
