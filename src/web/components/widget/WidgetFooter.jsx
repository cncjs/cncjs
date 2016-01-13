import _ from 'lodash';
import classNames from 'classnames';
import React from 'react';

class WidgetFooter extends React.Component {
    render() {
        let options = _.defaultsDeep({}, this.props, {
            type: 'default'
        });
        let footerClass = classNames(
            'widget-footer',
            { 'widget-footer-default': options.type === 'default' },
            { 'widget-footer-inverse': options.type === 'inverse' }
        );

        return (
            <div {...this.props} className={footerClass}>
                {this.props.children}
            </div>
        );
    }
}

export default WidgetFooter;
