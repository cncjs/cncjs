import classNames from 'classnames';
import React from 'react';
import i18n from '../../../lib/i18n';
import store from '../../../store';
import { Widget, WidgetHeader, WidgetControls, WidgetToolbar, WidgetContent } from '../../widget';
import Webcam from './Webcam';
import './index.css';

class WebcamWidget extends React.Component {
    static propTypes = {
        onDelete: React.PropTypes.func
    };
    state = {
        disabled: store.get('widgets.webcam.disabled'),
        isCollapsed: false,
        isFullscreen: false
    };

    componentDidUpdate() {
        store.set('widgets.webcam.disabled', this.state.disabled);
    }
    handleWebcamOnOff() {
        const { disabled } = this.state;
        this.setState({ disabled: !disabled });
    }
    handleClick(target, val) {
        const handler = {
            'edit': () => {
                this.refs.webcam.editSettings();
            },
            'refresh': () => {
                this.refs.webcam.reload();
            },
            'toggle': () => {
                this.setState({ isCollapsed: !!val });
            },
            'fullscreen': () => {
                this.setState({ isFullscreen: !!val });
            },
            'delete': () => {
                this.props.onDelete();
            }
        }[target];

        handler && handler();
    }
    render() {
        const { disabled, isCollapsed, isFullscreen } = this.state;
        let title = i18n._('Webcam');
        let controlButtons = [
            'edit',
            'refresh',
            'toggle',
            'fullscreen',
            'delete'
        ];
        let classes = {
            widgetContent: classNames(
                { 'hidden': isCollapsed }
            ),
            webcamOnOff: classNames(
                'fa',
                { 'fa-toggle-on': !disabled },
                { 'fa-toggle-off': disabled }
            )
        };

        return (
            <div {...this.props} data-ns="widgets/webcam">
                <Widget fullscreen={isFullscreen}>
                    <WidgetHeader>
                        <h3 className="widget-header-title">{title}</h3>
                        <WidgetControls
                            buttons={controlButtons}
                            onClick={::this.handleClick}
                        />
                        <WidgetToolbar>
                            <a
                                href="javascript:void(0)"
                                className="btn-icon"
                                onClick={::this.handleWebcamOnOff}
                                title={i18n._('Webcam On/Off')}
                            >
                                <i className={classes.webcamOnOff}></i>
                            </a>
                        </WidgetToolbar>
                    </WidgetHeader>
                    <WidgetContent className={classes.widgetContent}>
                        <Webcam ref="webcam" disabled={disabled} />
                    </WidgetContent>
                </Widget>
            </div>
        );
    }
}

export default WebcamWidget;
