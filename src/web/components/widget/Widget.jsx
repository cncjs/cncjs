import classNames from 'classnames';
import React from 'react';

class Widget extends React.Component {
    static defaultProps = {
        options: {}
    };
    static propTypes = {
        options: React.PropTypes.object
    };

    render() {
        let options = this.props;
        let widgetClass = classNames(
            'widget',
            { 'widget-borderless': !!options.borderless }
        );
        let widgetStyle = {
            width: options.width ? options.width : null
        };

        return (
            <div {...this.props} data-component="Widget">
                <div className={widgetClass} style={widgetStyle}>
                    {this.props.children}
                </div>
            </div>
        );
    }
}

export default Widget;
