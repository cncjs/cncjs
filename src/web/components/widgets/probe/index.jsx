import classNames from 'classnames';
import React from 'react';
import i18n from '../../../lib/i18n';
import Widget from '../../widget';
import Probe from './Probe';
import './index.styl';

class ProbeWidget extends React.Component {
    static propTypes = {
        onDelete: React.PropTypes.func
    };
    static defaultProps = {
        onDelete: () => {}
    };

    state = {
        isCollapsed: false,
        isFullscreen: false
    };

    render() {
        const { isCollapsed, isFullscreen } = this.state;
        const classes = {
            widgetContent: classNames(
                { hidden: isCollapsed }
            )
        };

        return (
            <div {...this.props} data-ns="widgets/probe">
                <Widget fullscreen={isFullscreen}>
                    <Widget.Header>
                        <Widget.Title>{i18n._('Probe')}</Widget.Title>
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
                            <Widget.Button
                                type="delete"
                                onClick={(event) => this.props.onDelete()}
                            />
                        </Widget.Controls>
                    </Widget.Header>
                    <Widget.Content className={classes.widgetContent}>
                        <Probe />
                    </Widget.Content>
                </Widget>
            </div>
        );
    }
}

export default ProbeWidget;
