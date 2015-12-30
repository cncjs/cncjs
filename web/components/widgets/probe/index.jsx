import classNames from 'classnames';
import i18n from 'i18next';
import React from 'react';
import Probe from './Probe';
import { Widget, WidgetHeader, WidgetContent } from '../../widget';
import './index.css';

class ProbeWidget extends React.Component {
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
        let title = i18n._('Probe');
        let toolbarButtons = [
            'toggle'
        ];
        let widgetContentClass = classNames(
            { 'hidden': this.state.isCollapsed }
        );

        return (
            <div {...this.props} data-component="Widgets/ProbeWidget">
                <Widget width={width}>
                    <WidgetHeader
                        title={title}
                        toolbarButtons={toolbarButtons}
                        handleClick={::this.handleClick}
                    />
                    <WidgetContent className={widgetContentClass}>
                        <Probe />
                    </WidgetContent>
                </Widget>
            </div>
        );
    }
}

export default ProbeWidget;
