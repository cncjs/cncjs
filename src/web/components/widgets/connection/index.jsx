import classNames from 'classnames';
import React from 'react';
import i18n from '../../../lib/i18n';
import Widget, { Buttons } from '../../widget';
import Connection from './Connection';
import './index.css';

class ConnectionWidget extends React.Component {
    static propTypes = {
        onDelete: React.PropTypes.func.isRequired
    };
    state = {
        isCollapsed: false,
        isFullscreen: false
    };

    render() {
        const { isCollapsed, isFullscreen } = this.state;
        const classes = {
            widgetContent: classNames(
                { 'hidden': isCollapsed }
            )
        };

        return (
            <div {...this.props} data-ns="widgets/connection">
                <Widget fullscreen={isFullscreen}>
                    <Widget.Header>
                        <Widget.Title>{i18n._('Connection')}</Widget.Title>
                        <Widget.Controls>
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
                        </Widget.Controls>
                    </Widget.Header>
                    <Widget.Content className={classes.widgetContent}>
                        <Connection />
                    </Widget.Content>
                </Widget>
            </div>
        );
    }
}

export default ConnectionWidget;
