import classNames from 'classnames';
import i18n from 'i18next';
import React from 'react';
import Connection from './Connection';
import { Widget, WidgetHeader, WidgetContent } from '../../widget';
import './index.css';

class ConnectionWidget extends React.Component {
    state = {
        isCollapsed: false
    };

    handleClick(target, val) {
        if (target === 'toggle') {
            this.setState({
                isCollapsed: !!val
            });
        }
    }
    render() {
        let width = 360;
        let title = i18n._('Connection');
        let toolbarButtons = [
            'toggle'
        ];
        let widgetContentClass = classNames(
            { 'hidden': this.state.isCollapsed }
        );

        return (
            <div {...this.props} data-component="Widgets/ConnectionWidget">
                <Widget width={width}>
                    <WidgetHeader
                        title={title}
                        toolbarButtons={toolbarButtons}
                        handleClick={::this.handleClick}
                    />
                    <WidgetContent className={widgetContentClass}>
                        <Connection />
                    </WidgetContent>
                </Widget>
            </div>
        );
    }
}

export default ConnectionWidget;
