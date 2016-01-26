import classNames from 'classnames';
import React from 'react';
import i18n from '../../../lib/i18n';
import store from '../../../store';
import { Widget, WidgetHeader, WidgetContent } from '../../widget';
import GCode from './GCode';
import './index.css';

class GCodeWidget extends React.Component {
    state = {
        isCollapsed: false,
        isFullscreen: false
    };

    handleClick(target, val) {
        const handler = {
            'toggle': () => {
                this.setState({ isCollapsed: !!val });
            },
            'fullscreen': () => {
                this.setState({ isFullscreen: !!val });
            },
            'delete': () => {
                store.set('widgets.gcode.state.visibility', 'hidden');
            }
        }[target];

        handler && handler();
    }
    render() {
        let title = i18n._('G-code');
        let controlButtons = [
            'toggle',
            'fullscreen',
            'delete'
        ];
        let classes = {
            widgetContent: classNames(
                { 'hidden': this.state.isCollapsed }
            )
        };

        return (
            <div {...this.props} data-component="Widgets/GCodeWidget">
                <Widget fullscreen={this.state.isFullscreen}>
                    <WidgetHeader
                        title={title}
                        controlButtons={controlButtons}
                        handleClick={::this.handleClick}
                    />
                    <WidgetContent className={classes.widgetContent}>
                        <GCode />
                    </WidgetContent>
                </Widget>
            </div>
        );
    }
}

export default GCodeWidget;
