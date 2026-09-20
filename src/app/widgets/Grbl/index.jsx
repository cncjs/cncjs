import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Space from 'app/components/Space';
import Widget from 'app/components/Widget';
import GrblModule from 'app/features/grbl/GrblModule';
import MachinePanel from 'app/features/grbl/MachinePanel';
import { grblCommands } from 'app/features/grbl/commands';
import i18n from 'app/lib/i18n';
import WidgetConfig from '../WidgetConfig';
import Controller from './Controller';
import {
  MODAL_NONE,
  MODAL_CONTROLLER
} from './constants';
import styles from './index.styl';

/**
 * The Grbl controller, placed in the workspace as a widget.
 *
 * This file is now only the placement: the panel chrome, the collapse toggle,
 * the command menu and the fork/remove menu, all of which belong to the
 * workspace rather than to Grbl. What the machine is actually doing lives in
 * `app/features/grbl` — the module that listens to the controller, and a view
 * that arranges its readings. Put the same two somewhere else and the feature
 * moves with them; this file would not follow.
 *
 * Which sections are open is remembered here rather than in the feature. It is
 * a fact about this widget in this workspace, not about the machine, and the
 * same panel on a screen of its own would have its own answer.
 */
class GrblWidget extends PureComponent {
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
        this.setState({ minimized: !this.state.minimized });
      },
      openModal: (name = MODAL_NONE, params = {}) => {
        this.setState({ modal: { name, params } });
      },
      closeModal: () => {
        this.setState({ modal: { name: MODAL_NONE, params: {} } });
      },
      selectTab: (activeTab) => {
        this.setState({
          modal: {
            ...this.state.modal,
            params: { ...this.state.modal.params, activeTab }
          }
        });
      },
      togglePanel: (name) => {
        const panel = this.state.panel;
        this.setState({
          panel: {
            ...panel,
            [name]: { ...panel[name], expanded: !panel[name].expanded }
          }
        });
      }
    };

    componentDidUpdate() {
      const { minimized, panel } = this.state;

      this.config.set('minimized', minimized);
      this.config.set('panel.queueReports.expanded', panel.queueReports.expanded);
      this.config.set('panel.statusReports.expanded', panel.statusReports.expanded);
      this.config.set('panel.modalGroups.expanded', panel.modalGroups.expanded);
    }

    getInitialState() {
      return {
        minimized: this.config.get('minimized', false),
        isFullscreen: false,
        modal: {
          name: MODAL_NONE,
          params: {}
        },
        panel: {
          queueReports: {
            expanded: this.config.get('panel.queueReports.expanded')
          },
          statusReports: {
            expanded: this.config.get('panel.statusReports.expanded')
          },
          modalGroups: {
            expanded: this.config.get('panel.modalGroups.expanded')
          }
        }
      };
    }

    renderCommands(canSend) {
      return grblCommands().map(({ id, label, divider, run }) => {
        if (divider) {
          return <Widget.DropdownMenuItem key={id} divider />;
        }
        return (
          <Widget.DropdownMenuItem key={id} onSelect={run} disabled={!canSend}>
            {label}
          </Widget.DropdownMenuItem>
        );
      });
    }

    render() {
      const { widgetId } = this.props;
      const { minimized, isFullscreen, modal, panel } = this.state;
      const actions = this.actions;
      const isForkedWidget = widgetId.match(/\w+:[\w\-]+/);

      return (
        <GrblModule>
          {(machine) => (
            <Widget aria-label="Grbl widget" fullscreen={isFullscreen}>
              <Widget.Header>
                <Widget.Title>
                  <Widget.Sortable className={this.props.sortable.handleClassName}>
                    <i aria-hidden="true" className="fa fa-bars" />
                    <Space width="8" />
                  </Widget.Sortable>
                  {isForkedWidget &&
                    <i aria-hidden="true" className="fa fa-code-fork" style={{ marginRight: 5 }} />}
                  Grbl
                </Widget.Title>
                <Widget.Controls className={this.props.sortable.filterClassName}>
                  {machine.ready && (
                    <Widget.Button
                      aria-label="Grbl controller info"
                      onClick={() => actions.openModal(MODAL_CONTROLLER)}
                    >
                      <i aria-hidden="true" className="fa fa-info" />
                    </Widget.Button>
                  )}
                  {machine.ready && (
                    <Widget.DropdownButton
                      aria-label="Grbl commands"
                      toggle={<i aria-hidden="true" className="fa fa-th-large" />}
                    >
                      {this.renderCommands(machine.canSend)}
                    </Widget.DropdownButton>
                  )}
                  {machine.ready && (
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
                  )}
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
                    <Widget.DropdownMenuItem eventKey="fullscreen" disabled={!machine.ready}>
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
              {machine.ready && (
                <Widget.Content
                  aria-hidden={minimized}
                  className={classNames(
                    styles['widget-content'],
                    { [styles.hidden]: minimized }
                  )}
                >
                  {modal.name === MODAL_CONTROLLER && (
                    <Controller
                      controllerState={machine.controllerState}
                      controllerSettings={machine.settings}
                      activeTab={modal.params.activeTab}
                      onSelectTab={actions.selectTab}
                      onClose={actions.closeModal}
                    />
                  )}
                  {/*
                    * The view stays mounted while the panel is collapsed.
                    * Hiding is the chrome's business; unmounting would drop
                    * the controller subscriptions and lose the readings.
                    */}
                  <MachinePanel
                    state={machine}
                    panel={panel}
                    onTogglePanel={actions.togglePanel}
                  />
                </Widget.Content>
              )}
            </Widget>
          )}
        </GrblModule>
      );
    }
}

export default GrblWidget;
