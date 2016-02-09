import _ from 'lodash';
import classNames from 'classnames';
import React from 'react';

class WidgetHeader extends React.Component {
    static propTypes = {
        onClick: React.PropTypes.func
    };

    render() {
        const { className, ...props } = this.props;
        const widgetHeaderClass = classNames(
            'widget-header',
            'clearfix',
            className
        );

        return (
            <div {...props} className={widgetHeaderClass}>
                {this.props.children}
            </div>
        );
    }
}

export default WidgetHeader;
