import classNames from 'classnames';
import React from 'react';

class WidgetContent extends React.Component {
    render() {
        const { className, ...props } = this.props;
        const widgetContentClass = classNames(
            'widget-content',
            className
        );

        return (
            <div {...props} className={widgetContentClass}>
                {this.props.children}
            </div>
        );
    }
}

export default WidgetContent;
