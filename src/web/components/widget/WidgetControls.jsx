import _ from 'lodash';
import React from 'react';
import classNames from 'classnames';

class WidgetControls extends React.Component {
    static propTypes = {
        children: React.PropTypes.node
    };

    render() {
        const { children, className, ...props } = this.props;
        const widgetControlsClass = classNames(
            'widget-controls',
            className
        );

        return (
            <div {...props} className={widgetControlsClass}>
                {children}
            </div>
        );
    }
}

export default WidgetControls;
