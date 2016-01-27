import _ from 'lodash';
import React from 'react';
import WidgetHeaderControls from './WidgetHeaderControls';

class WidgetHeader extends React.Component {
    render() {
        let options = _.defaultsDeep({}, this.props, {
            type: 'default',
            title: '',
            controlButtons: []
        });

        return (
            <div {...this.props} className="widget-header clearfix">
                <h3 className="widget-header-title">{options.title}</h3>
                <WidgetHeaderControls
                    buttons={options.controlButtons}
                    handleClick={this.props.handleClick}
                />
            </div>
        );
    }
}

export default WidgetHeader;
