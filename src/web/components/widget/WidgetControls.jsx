import _ from 'lodash';
import React from 'react';
import classNames from 'classnames';

class WidgetControls extends React.Component {
    render() {
        const { className, ...props } = this.props;
        const widgetControlsClass = classNames(
            'widget-controls',
            className
        );

        return (
            <div {...props} className={widgetControlsClass}>
                {this.props.children}
            </div>
        );
    }
}

export default WidgetControls;
