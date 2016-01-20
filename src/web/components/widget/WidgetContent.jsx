import classNames from 'classnames';
import joinClasses from 'fbjs/lib/joinClasses';
import React from 'react';

class WidgetContent extends React.Component {
    render() {
        let contentClass = classNames(
            'widget-content'
        );

        return (
            <div {...this.props} className={joinClasses(contentClass, this.props.className)}>
                {this.props.children}
            </div>
        );
    }
}

export default WidgetContent;
