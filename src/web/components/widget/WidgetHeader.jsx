import _ from 'lodash';
import classNames from 'classnames';
import React from 'react';
import WidgetControls from './WidgetControls';

class WidgetHeader extends React.Component {
    static propTypes = {
        onClick: React.PropTypes.func
    };

    render() {
        const { className, title, controlButtons = [], onClick, ...props } = this.props;
        const widgetHeaderClass = classNames(
            'widget-header',
            'clearfix',
            className
        );

        return (
            <div {...props} className={widgetHeaderClass}>
                <h3 className="widget-header-title">{title}</h3>
                <WidgetControls
                    buttons={controlButtons}
                    onClick={onClick}
                />
            </div>
        );
    }
}

export default WidgetHeader;
