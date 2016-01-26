import classNames from 'classnames';
import React from 'react';
import i18n from '../../../lib/i18n';
import store from '../../../store';
import { Widget, WidgetHeader, WidgetContent } from '../../widget';
import Axes from './Axes';
import './index.css';

class AxesWidget extends React.Component {
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
                store.set('widgets.axes.state.visibility', 'hidden');
            }
        }[target];

        handler && handler();
    }
    render() {
        let title = i18n._('Axes');
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
            <div {...this.props} data-component="Widgets/AxesWidget">
                <Widget fullscreen={this.state.isFullscreen}>
                    <WidgetHeader
                        title={title}
                        controlButtons={controlButtons}
                        handleClick={::this.handleClick}
                    />
                    <WidgetContent className={classes.widgetContent}>
                        <Axes />
                    </WidgetContent>
                </Widget>
            </div>
        );
    }
}

export default AxesWidget;
