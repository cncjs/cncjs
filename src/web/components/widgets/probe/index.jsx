import classNames from 'classnames';
import React from 'react';
import i18n from '../../../lib/i18n';
import store from '../../../store';
import { Widget, WidgetHeader, WidgetContent } from '../../widget';
import Probe from './Probe';
import './index.css';

class ProbeWidget extends React.Component {
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
                store.set('widgets.probe.state.visibility', 'hidden');
            }
        }[target];

        handler && handler();
    }
    render() {
        let title = i18n._('Probe');
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
            <div {...this.props} data-component="Widgets/ProbeWidget">
                <Widget fullscreen={this.state.isFullscreen}>
                    <WidgetHeader
                        title={title}
                        controlButtons={controlButtons}
                        handleClick={::this.handleClick}
                    />
                    <WidgetContent className={classes.widgetContent}>
                        <Probe />
                    </WidgetContent>
                </Widget>
            </div>
        );
    }
}

export default ProbeWidget;
