import _ from 'lodash';
import classNames from 'classnames';
import React from 'react';

class WidgetFooter extends React.Component {
    render() {
        const { className, ...props } = this.props;
        const widgetFooterClass = classNames(
            'widget-footer',
            className
        );

        return (
            <div {...props} className={widgetFooterClass}>
                {this.props.children}
            </div>
        );
    }
}

export default WidgetFooter;
