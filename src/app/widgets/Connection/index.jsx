import PropTypes from 'prop-types';
import React, { Component } from 'react';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import Space from 'app/components/Space';
import { ToastManager } from 'app/components/ToastManager';
import Widget from 'app/components/Widget';
import i18n from 'app/lib/i18n';
import WidgetConfig from 'app/widgets/shared/WidgetConfig';
import WidgetConfigProvider from 'app/widgets/shared/WidgetConfigProvider';
import Connection from './Connection';

class ConnectionWidget extends Component {
    static propTypes = {
        widgetId: PropTypes.string.isRequired,
        onFork: PropTypes.func.isRequired,
        onRemove: PropTypes.func.isRequired,
        sortable: PropTypes.object
    };

    // Public methods
    collapse = () => {
        this.setState({ minimized: true });
    };

    expand = () => {
        this.setState({ minimized: false });
    };

    config = new WidgetConfig(this.props.widgetId);

    state = this.getInitialState();

    toggleFullscreen = () => {
        this.setState(state => ({
            minimized: state.isFullscreen ? state.minimized : false,
            isFullscreen: !state.isFullscreen,
        }));
    };

    toggleMinimized = () => {
        this.setState(state => ({
            minimized: !state.minimized,
        }));
    };

    componentDidUpdate(prevProps, prevState) {
        this.config.set('minimized', this.state.minimized);
    }

    getInitialState() {
        return {
            minimized: this.config.get('minimized', false),
            isFullscreen: false,
        };
    }

    render() {
        const { widgetId } = this.props;
        const { minimized, isFullscreen } = this.state;
        const isForkedWidget = widgetId.match(/\w+:[\w\-]+/);

        return (
            <WidgetConfigProvider config={this.config}>
                <Widget fullscreen={isFullscreen}>
                    <Widget.Header>
                        <Widget.Title>
                            <Widget.Sortable className={this.props.sortable.handleClassName}>
                                <FontAwesomeIcon icon="bars" fixedWidth />
                                <Space width={4} />
                            </Widget.Sortable>
                            {isForkedWidget &&
                            <FontAwesomeIcon icon="code-branch" fixedWidth />
                            }
                            {i18n._('Connection')}
                        </Widget.Title>
                        <Widget.Controls className={this.props.sortable.filterClassName}>
                            <Widget.Button
                                disabled={isFullscreen}
                                title={minimized ? i18n._('Expand') : i18n._('Collapse')}
                                onClick={this.toggleMinimized}
                            >
                                {minimized &&
                                <FontAwesomeIcon icon="chevron-down" fixedWidth />
                                }
                                {!minimized &&
                                <FontAwesomeIcon icon="chevron-up" fixedWidth />
                                }
                            </Widget.Button>
                            {isFullscreen && (
                                <Widget.Button
                                    title={i18n._('Exit Full Screen')}
                                    onClick={this.toggleFullscreen}
                                >
                                    <FontAwesomeIcon icon="compress" fixedWidth />
                                </Widget.Button>
                            )}
                            <Widget.DropdownButton
                                title={i18n._('More')}
                                toggle={(
                                    <FontAwesomeIcon icon="ellipsis-v" fixedWidth />
                                )}
                                onSelect={(eventKey) => {
                                    if (eventKey === 'fullscreen') {
                                        this.toggleFullscreen();
                                    }
                                }}
                            >
                                <Widget.DropdownMenuItem eventKey="fullscreen">
                                    {!isFullscreen && (
                                        <FontAwesomeIcon icon="expand" fixedWidth />
                                    )}
                                    {isFullscreen && (
                                        <FontAwesomeIcon icon="compress" fixedWidth />
                                    )}
                                    <Space width="8" />
                                    {!isFullscreen ? i18n._('Enter Full Screen') : i18n._('Exit Full Screen')}
                                </Widget.DropdownMenuItem>
                            </Widget.DropdownButton>
                        </Widget.Controls>
                    </Widget.Header>
                    <Widget.Content
                        style={{
                            display: (minimized ? 'none' : 'block'),
                        }}
                    >
                        <ToastManager>
                            <Connection />
                        </ToastManager>
                    </Widget.Content>
                </Widget>
            </WidgetConfigProvider>
        );
    }
}

export default ConnectionWidget;
