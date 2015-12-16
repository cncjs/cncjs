import _ from 'lodash';
import classNames from 'classnames';
import joinClasses from 'fbjs/lib/joinClasses';
import React from 'react';
import WidgetHeaderToolbar from './WidgetHeaderToolbar';

class WidgetHeader extends React.Component {
    render() {
        let options = _.defaultsDeep({}, this.props, {
            type: 'default',
            title: '',
            toolbarButtons: []
        });
        let divClassNames = classNames(
            'widget-header',
            'clearfix',
            { 'widget-header-default': options.type === 'default' },
            { 'widget-header-inverse': options.type === 'inverse' }
        );

        return (
            <div className={divClassNames}>
                <h3 className="widget-header-title">{options.title}</h3>
                <WidgetHeaderToolbar buttons={options.toolbarButtons} handleClick={this.props.handleClick}/>
            </div>
        );
    }
}

export default WidgetHeader;
