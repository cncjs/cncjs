import {
  Space,
} from '@trendmicro/react-styled-ui';
import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import Widget from 'app/components/Widget';
import i18n from 'app/lib/i18n';
import WidgetConfig from 'app/widgets/shared/WidgetConfig';
import WidgetConfigProvider from 'app/widgets/shared/WidgetConfigProvider';
import WidgetEventProvider from 'app/widgets/shared/WidgetEventProvider';
import Console from './Console';
import styles from './index.styl';

class ConsoleWidget extends Component {
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
      const {
        minimized
      } = this.state;

      this.config.set('minimized', minimized);
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
        <WidgetConfigProvider widgetId={widgetId}>
          <WidgetEventProvider>
            {(emitter) => (
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
                    {i18n._('Console')}
                  </Widget.Title>
                  <Widget.Controls className={this.props.sortable.filterClassName}>
                    <Widget.Button
                      title={i18n._('Clear all')}
                      onClick={this.clearAll}
                    >
                      <FontAwesomeIcon icon="trash-alt" fixedWidth />
                    </Widget.Button>
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
                    <Widget.Button
                      title={!isFullscreen ? i18n._('Enter Full Screen') : i18n._('Exit Full Screen')}
                      onClick={this.toggleFullscreen}
                    >
                      {isFullscreen &&
                      <FontAwesomeIcon icon="compress" fixedWidth />
                      }
                      {!isFullscreen &&
                      <FontAwesomeIcon icon="expand" fixedWidth />
                      }
                    </Widget.Button>
                    <Widget.DropdownButton
                      title={i18n._('More')}
                      toggle={(
                        <FontAwesomeIcon icon="ellipsis-v" fixedWidth />
                      )}
                      onSelect={(eventKey) => {
                        if (eventKey === 'refresh') {
                          emitter.emit('terminal:refresh');
                        } else if (eventKey === 'selectAll') {
                          emitter.emit('terminal:selectAll');
                        } else if (eventKey === 'copySelection') {
                          if (typeof document.execCommand === 'function') {
                            document.execCommand('copy');
                          }
                        } else if (eventKey === 'clearSelection') {
                          emitter.emit('terminal:clearSelection');
                        } else if (eventKey === 'fullscreen') {
                          this.toggleFullscreen();
                        } if (eventKey === 'fork') {
                          this.props.onFork();
                        } else if (eventKey === 'remove') {
                          this.props.onRemove();
                        }
                      }}
                    >
                      <Widget.DropdownMenuItem eventKey="refresh">
                        <FontAwesomeIcon icon="undo-alt" fixedWidth />
                        <Space width={8} />
                        {i18n._('Refresh')}
                      </Widget.DropdownMenuItem>
                      <Widget.DropdownMenuItem eventKey="selectAll">
                        <i
                          className={cx(
                            styles.icon,
                            styles.selectAll
                          )}
                        />
                        <Space width={8} />
                        {i18n._('Select All')}
                      </Widget.DropdownMenuItem>
                      <Widget.DropdownMenuItem eventKey="copySelection">

                        <FontAwesomeIcon icon="copy" fixedWidth />
                        <Space width={8} />
                        {i18n._('Copy Selection')}
                      </Widget.DropdownMenuItem>
                      <Widget.DropdownMenuItem eventKey="clearSelection">

                        <FontAwesomeIcon icon="eraser" fixedWidth />
                        <Space width={8} />
                        {i18n._('Clear Selection')}
                      </Widget.DropdownMenuItem>
                      <Widget.DropdownMenuItem eventKey="fullscreen">
                        {!isFullscreen && (
                          <FontAwesomeIcon icon="expand" fixedWidth />
                        )}
                        {isFullscreen && (
                          <FontAwesomeIcon icon="compress" fixedWidth />
                        )}
                        <Space width={8} />
                        {!isFullscreen ? i18n._('Enter Full Screen') : i18n._('Exit Full Screen')}
                      </Widget.DropdownMenuItem>
                      <Widget.DropdownMenuItem eventKey="fork">
                        <FontAwesomeIcon icon="code-branch" fixedWidth />
                        <Space width={8} />
                        {i18n._('Fork Widget')}
                      </Widget.DropdownMenuItem>
                      <Widget.DropdownMenuItem eventKey="remove">
                        <FontAwesomeIcon icon="times" fixedWidth />
                        <Space width={8} />
                        {i18n._('Remove Widget')}
                      </Widget.DropdownMenuItem>
                    </Widget.DropdownButton>
                  </Widget.Controls>
                </Widget.Header>
                <Widget.Content
                  className={cx(
                    styles.widgetContent,
                    { [styles.hidden]: minimized },
                    { [styles.fullscreen]: isFullscreen }
                  )}
                >
                  <Console
                    isFullscreen={isFullscreen}
                  />
                </Widget.Content>
              </Widget>
            )}
          </WidgetEventProvider>
        </WidgetConfigProvider>
      );
    }
}

export default ConsoleWidget;
