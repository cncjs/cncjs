import classNames from 'classnames';
import i18n from 'i18next';
import React from 'react';
import Spindle from './Spindle';
import { Widget, WidgetHeader, WidgetContent } from '../../widget';
import './index.css';

class SpindleWidget extends React.Component {
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
        let title = (
            <div><i className="glyphicon glyphicon-cd"></i>{i18n._('Spindle')}</div>
        );
        let toolbarButtons = [
            'toggle'
        ];
        let widgetContentClass = classNames(
            { 'hidden': this.state.isCollapsed }
        );

        return (
            <div data-component="Widgets/SpindleWidget">
                <Widget width={width}>
                    <WidgetHeader
                        title={title}
                        toolbarButtons={toolbarButtons}
                        handleClick={::this.handleClick}
                    />
                    <WidgetContent className={widgetContentClass}>
                        <Spindle />
                    </WidgetContent>
                </Widget>
            </div>
        );
    }
}

export default SpindleWidget;
