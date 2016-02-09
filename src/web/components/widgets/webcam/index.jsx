import classNames from 'classnames';
import React from 'react';
import i18n from '../../../lib/i18n';
import store from '../../../store';
import Widget from '../../widget';
import Webcam from './Webcam';
import './index.css';

class WebcamWidget extends React.Component {
    static propTypes = {
        onDelete: React.PropTypes.func.isRequired
    };
    state = {
        disabled: store.get('widgets.webcam.disabled'),
        isCollapsed: false,
        isFullscreen: false
    };

    componentDidUpdate(prevProps, prevState) {
        store.set('widgets.webcam.disabled', this.state.disabled);
    }
    render() {
        const { disabled, isCollapsed, isFullscreen } = this.state;
        const classes = {
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
                    <Widget.Header>
                        <Widget.Title>{i18n._('Webcam')}</Widget.Title>
                        <Widget.Controls>
                            <Widget.Button
                                type="edit"
                                onClick={(event, val) => this.refs.webcam.editSettings()}
                            />
                            <Widget.Button
                                type="refresh"
                                onClick={(event, val) => this.refs.webcam.reload()}
                            />
                            <Widget.Button
                                type="toggle"
                                defaultValue={isCollapsed}
                                onClick={(event, val) => this.setState({ isCollapsed: !!val })}
                            />
                            <Widget.Button
                                type="fullscreen"
                                defaultValue={isFullscreen}
                                onClick={(event, val) => this.setState({ isFullscreen: !!val })}
                            />
                            <Widget.Button
                                type="delete"
                                onClick={(event) => this.props.onDelete()}
                            />
                        </Widget.Controls>
                        <Widget.Toolbar>
                            <Widget.Button
                                type="default"
                                onClick={(event) => this.setState({ disabled: !disabled })}
                            >
                                <i className={classes.webcamOnOff}></i>
                            </Widget.Button>
                        </Widget.Toolbar>
                    </Widget.Header>
                    <Widget.Content className={classes.widgetContent}>
                        <Webcam ref="webcam" disabled={disabled} />
                    </Widget.Content>
                </Widget>
            </div>
        );
    }
}

export default WebcamWidget;
