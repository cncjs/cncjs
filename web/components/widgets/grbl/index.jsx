import _ from 'lodash';
import classNames from 'classnames';
import i18n from 'i18next';
import React from 'react';
import Grbl from './Grbl';
import { Widget, WidgetHeader, WidgetContent } from '../../widget';
import './index.css';

class GrblWidget extends React.Component {
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
            <div><i className="glyphicon glyphicon-wrench"></i>{i18n._('Grbl')}</div>
        );
        let toolbarButtons = [
            'toggle'
        ];
        let widgetContentClass = classNames(
            { 'hidden': this.state.isCollapsed }
        );

        return (
            <div {...this.props} data-component="Widgets/GrblWidget">
                <Widget width={width}>
                    <WidgetHeader
                        title={title}
                        toolbarButtons={toolbarButtons}
                        handleClick={::this.handleClick}
                    />
                    <WidgetContent className={widgetContentClass}>
                        <Grbl />
                    </WidgetContent>
                </Widget>
            </div>
        );
    }
}

export default GrblWidget;
