import _ from 'lodash';
import classNames from 'classnames';
import i18n from 'i18next';
import React from 'react';
import GCode from './GCode';
import { Widget, WidgetHeader, WidgetContent } from '../../widget';
import './index.css';

class GCodeWidget extends React.Component {
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
            <div><i className="glyphicon glyphicon-dashboard"></i>{i18n._('G-code')}</div>
        );
        let toolbarButtons = [
            'toggle'
        ];
        let widgetContentClass = classNames(
            { 'hidden': this.state.isCollapsed }
        );

        return (
            <div data-component="Widgets/GCodeWidget">
                <Widget width={width}>
                    <WidgetHeader
                        title={title}
                        toolbarButtons={toolbarButtons}
                        handleClick={::this.handleClick}
                    />
                    <WidgetContent className={widgetContentClass}>
                        <GCode width={width} />
                    </WidgetContent>
                </Widget>
            </div>
        );
    }
}

export default GCodeWidget;
