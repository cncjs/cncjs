import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Space from 'app/components/Space';
import Widget from 'app/components/Widget';
import GCodeModule from 'app/features/gcode/GCodeModule';
import JobProgress from 'app/features/gcode/JobProgress';
import i18n from 'app/lib/i18n';
import WidgetConfig from '../WidgetConfig';
import styles from './index.styl';

/**
 * The G-code feature, placed in the workspace as a widget.
 *
 * This file is now only the placement: the panel chrome, the collapse toggle
 * and the fork/remove menu, all of which belong to the workspace rather than
 * to G-code. What the job actually is lives in `app/features/gcode` — the
 * module that knows the readings, and a view that arranges them. Put the same
 * two somewhere else and the feature moves with them; this file would not
 * follow.
 */
class GCodeWidget extends PureComponent {
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

    actions = {
      toggleFullscreen: () => {
        const { minimized, isFullscreen } = this.state;
        this.setState({
          minimized: isFullscreen ? minimized : false,
          isFullscreen: !isFullscreen
        });
      },
      toggleMinimized: () => {
        const { minimized } = this.state;
        this.setState({ minimized: !minimized });
      }
    };

    componentDidUpdate() {
      this.config.set('minimized', this.state.minimized);
    }

    getInitialState() {
      return {
        minimized: this.config.get('minimized', false),
        isFullscreen: false
      };
    }

    render() {
      const { widgetId } = this.props;
      const { minimized, isFullscreen } = this.state;
      const actions = { ...this.actions };
      const isForkedWidget = widgetId.match(/\w+:[\w\-]+/);

      return (
        <Widget aria-label="G-code widget" fullscreen={isFullscreen}>
          <Widget.Header>
            <Widget.Title>
              <Widget.Sortable className={this.props.sortable.handleClassName}>
                <i aria-hidden="true" className="fa fa-bars" />
                <Space width="8" />
              </Widget.Sortable>
              {isForkedWidget &&
                <i aria-hidden="true" className="fa fa-code-fork" style={{ marginRight: 5 }} />}
              {i18n._('G-code')}
            </Widget.Title>
            <Widget.Controls className={this.props.sortable.filterClassName}>
              <Widget.Button
                aria-label={minimized ? 'Expand' : 'Collapse'}
                aria-expanded={!minimized}
                disabled={isFullscreen}
                title={minimized ? i18n._('Expand') : i18n._('Collapse')}
                onClick={actions.toggleMinimized}
              >
                <i
                  aria-hidden="true"
                  className={classNames(
                    'fa',
                    { 'fa-chevron-up': !minimized },
                    { 'fa-chevron-down': minimized }
                  )}
                />
              </Widget.Button>
              <Widget.DropdownButton
                aria-label="More options"
                title={i18n._('More')}
                toggle={<i aria-hidden="true" className="fa fa-ellipsis-v" />}
                onSelect={(eventKey) => {
                  if (eventKey === 'fullscreen') {
                    actions.toggleFullscreen();
                  } else if (eventKey === 'fork') {
                    this.props.onFork();
                  } else if (eventKey === 'remove') {
                    this.props.onRemove();
                  }
                }}
              >
                <Widget.DropdownMenuItem eventKey="fullscreen">
                  <i
                    aria-hidden="true"
                    className={classNames(
                      'fa',
                      'fa-fw',
                      { 'fa-expand': !isFullscreen },
                      { 'fa-compress': isFullscreen }
                    )}
                  />
                  <Space width="4" />
                  {!isFullscreen ? i18n._('Enter Full Screen') : i18n._('Exit Full Screen')}
                </Widget.DropdownMenuItem>
                <Widget.DropdownMenuItem eventKey="fork">
                  <i aria-hidden="true" className="fa fa-fw fa-code-fork" />
                  <Space width="4" />
                  {i18n._('Fork Widget')}
                </Widget.DropdownMenuItem>
                <Widget.DropdownMenuItem eventKey="remove">
                  <i aria-hidden="true" className="fa fa-fw fa-times" />
                  <Space width="4" />
                  {i18n._('Remove Widget')}
                </Widget.DropdownMenuItem>
              </Widget.DropdownButton>
            </Widget.Controls>
          </Widget.Header>
          <Widget.Content
            aria-hidden={minimized}
            className={classNames(
              styles['widget-content'],
              { [styles.hidden]: minimized }
            )}
          >
            {/*
              * The module stays mounted while the panel is collapsed. Hiding is
              * the chrome's business; unmounting would drop the controller
              * subscriptions and lose the loaded job.
              */}
            <GCodeModule>
              {(state) => <JobProgress state={state} />}
            </GCodeModule>
          </Widget.Content>
        </Widget>
      );
    }
}

export default GCodeWidget;
