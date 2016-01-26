import classNames from 'classnames';
import React from 'react';
import i18n from '../../../lib/i18n';
import store from '../../../store';
import { Widget, WidgetHeader, WidgetContent } from '../../widget';
import Console from './Console';
import './index.css';

class ConsoleWidget extends React.Component {
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
                store.set('widgets.console.state.visibility', 'hidden');
            }
        }[target];

        handler && handler();
    }
    render() {
        let title = i18n._('Console');
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
            <div {...this.props} data-component="Widgets/ConsoleWidget">
                <Widget fullscreen={this.state.isFullscreen}>
                    <WidgetHeader
                        title={title}
                        controlButtons={controlButtons}
                        handleClick={::this.handleClick}
                    />
                    <WidgetContent className={classes.widgetContent}>
                        <Console fullscreen={this.state.isFullscreen} />
                    </WidgetContent>
                </Widget>
            </div>
        );
    }
}

export default ConsoleWidget;
