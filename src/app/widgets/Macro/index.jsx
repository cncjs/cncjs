import {
  Space,
} from '@trendmicro/react-styled-ui';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { interpret } from 'xstate';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import { ModalProvider, ModalRoot } from 'app/components/Modal';
import Widget from 'app/components/Widget';
import i18n from 'app/lib/i18n';
import WidgetConfig from 'app/widgets/shared/WidgetConfig';
import WidgetConfigProvider from 'app/widgets/shared/WidgetConfigProvider';
import Macro from './Macro';
import { ServiceContext } from './context';
import fetchMacrosMachine from './machines/fetchMacrosMachine';

class MacroWidget extends Component {
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

    fetchMacrosService = interpret(fetchMacrosMachine);

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

    // FIXME
    /*
    actions = {
      runMacro: (id, { name }) => {
        controller.command('macro:run', id, controller.context, (err, data) => {
          if (err) {
            log.error(`Failed to run the macro: id=${id}, name="${name}"`);
            return;
          }
        });
      },
      loadMacro: async (id, { name }) => {
        try {
          let res;
          res = await api.macros.read(id);
          const { name } = res.body;
          controller.command('macro:load', id, controller.context, (err, data) => {
            if (err) {
              log.error(`Failed to load the macro: id=${id}, name="${name}"`);
              return;
            }

            log.debug(data); // TODO
          });
        } catch (err) {
          // Ignore error
        }
      },
      openAddMacroModal: () => {
        this.actions.openModal(MODAL_ADD_MACRO);
      },
      openRunMacroModal: (id) => {
        api.macros.read(id)
          .then((res) => {
            const { id, name, content } = res.body;
            this.actions.openModal(MODAL_RUN_MACRO, { id, name, content });
          });
      },
      openEditMacroModal: (id) => {
        api.macros.read(id)
          .then((res) => {
            const { id, name, content } = res.body;
            this.actions.openModal(MODAL_EDIT_MACRO, { id, name, content });
          });
      }
    };
    */

    componentDidMount() {
      this.fetchMacrosService.start();
    }

    componentWillUnmount() {
      this.fetchMacrosService.stop();
    }

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
          <ServiceContext.Provider
            value={{
              fetchMacrosService: this.fetchMacrosService,
            }}
          >
            <ModalProvider>
              <ModalRoot />
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
                    {i18n._('Macro')}
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
                        } else if (eventKey === 'fork') {
                          this.props.onFork();
                        } else if (eventKey === 'remove') {
                          this.props.onRemove();
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
                  style={{
                    display: (minimized ? 'none' : 'block'),
                  }}
                >
                  <Macro />
                </Widget.Content>
              </Widget>
            </ModalProvider>
          </ServiceContext.Provider>
        </WidgetConfigProvider>
      );
    }
}

export default MacroWidget;
