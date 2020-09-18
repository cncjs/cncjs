import _get from 'lodash/get';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import FormGroup from 'app/components/FormGroup';
import { Container } from 'app/components/GridSystem';
import { ModalProvider, ModalConsumer, ModalRoot } from 'app/components/Modal';
import Space from 'app/components/Space';
import Widget from 'app/components/Widget';
import i18n from 'app/lib/i18n';
import controller from 'app/lib/controller';
import WidgetConfig from 'app/widgets/shared/WidgetConfig';
import WidgetConfigProvider from 'app/widgets/shared/WidgetConfigProvider';
import {
  GRBL,
} from 'app/constants/controller';
import {
  CONNECTION_STATE_CONNECTED,
} from 'app/constants/connection';
import QueueReports from './QueueReports';
import StatusReports from './StatusReports';
import ModalGroups from './ModalGroups';
import FeedOverride from './FeedOverride';
import SpindleOverride from './SpindleOverride';
import RapidOverride from './RapidOverride';
import ControllerModal from './modals/ControllerModal';

class GrblWidget extends Component {
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
        minimized,
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
      const {
        widgetId,
        isReady,
      } = this.props;
      const { minimized, isFullscreen } = this.state;
      const isForkedWidget = widgetId.match(/\w+:[\w\-]+/);

      return (
        <WidgetConfigProvider widgetId={widgetId}>
          <ModalProvider>
            <ModalRoot />
            <ModalConsumer>
              {({ openModal }) => (
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
                      Grbl
                    </Widget.Title>
                    <Widget.Controls className={this.props.sortable.filterClassName}>
                      {isReady && (
                        <Widget.Button
                          onClick={(event) => {
                            openModal(ControllerModal);
                          }}
                        >
                          <i className="fa fa-info" />
                        </Widget.Button>
                      )}
                      {isReady && (
                        <Widget.DropdownButton
                          toggle={<i className="fa fa-th-large" />}
                        >
                          <Widget.DropdownMenuItem
                            onSelect={() => controller.write('?')}
                          >
                            {i18n._('Status Report (?)')}
                          </Widget.DropdownMenuItem>
                          <Widget.DropdownMenuItem
                            onSelect={() => controller.writeln('$C')}
                          >
                            {i18n._('Check G-code Mode ($C)')}
                          </Widget.DropdownMenuItem>
                          <Widget.DropdownMenuItem
                            onSelect={() => controller.command('homing')}
                          >
                            {i18n._('Homing ($H)')}
                          </Widget.DropdownMenuItem>
                          <Widget.DropdownMenuItem
                            onSelect={() => controller.command('unlock')}
                          >
                            {i18n._('Kill Alarm Lock ($X)')}
                          </Widget.DropdownMenuItem>
                          <Widget.DropdownMenuItem
                            onSelect={() => controller.command('sleep')}
                          >
                            {i18n._('Sleep ($SLP)')}
                          </Widget.DropdownMenuItem>
                          <Widget.DropdownMenuItem divider />
                          <Widget.DropdownMenuItem
                            onSelect={() => controller.writeln('$')}
                          >
                            {i18n._('Help ($)')}
                          </Widget.DropdownMenuItem>
                          <Widget.DropdownMenuItem
                            onSelect={() => controller.writeln('$$')}
                          >
                            {i18n._('Settings ($$)')}
                          </Widget.DropdownMenuItem>
                          <Widget.DropdownMenuItem
                            onSelect={() => controller.writeln('$#')}
                          >
                            {i18n._('View G-code Parameters ($#)')}
                          </Widget.DropdownMenuItem>
                          <Widget.DropdownMenuItem
                            onSelect={() => controller.writeln('$G')}
                          >
                            {i18n._('View G-code Parser State ($G)')}
                          </Widget.DropdownMenuItem>
                          <Widget.DropdownMenuItem
                            onSelect={() => controller.writeln('$I')}
                          >
                            {i18n._('View Build Info ($I)')}
                          </Widget.DropdownMenuItem>
                          <Widget.DropdownMenuItem
                            onSelect={() => controller.writeln('$N')}
                          >
                            {i18n._('View Startup Blocks ($N)')}
                          </Widget.DropdownMenuItem>
                        </Widget.DropdownButton>
                      )}
                      {isReady && (
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
                      )}
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
                        <Widget.DropdownMenuItem eventKey="fullscreen" disabled={!isReady}>
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
                  {isReady && (
                    <Widget.Content
                      style={{
                        display: (minimized ? 'none' : 'block'),
                      }}
                    >
                      <Container
                        fluid
                        style={{
                          padding: '.75rem',
                        }}
                      >
                        <FormGroup>
                          <FeedOverride />
                          <SpindleOverride />
                          <RapidOverride />
                        </FormGroup>
                        <Accordion>
                          <QueueReports />
                          <StatusReports />
                          <ModalGroups />
                        </Accordion>
                      </Container>
                    </Widget.Content>
                  )}
                </Widget>
              )}
            </ModalConsumer>
          </ModalProvider>
        </WidgetConfigProvider>
      );
    }
}

export default connect(store => {
  const controllerType = _get(store, 'controller.type');
  const connectionState = _get(store, 'connection.state');
  const isReady = (controllerType === GRBL) && (connectionState === CONNECTION_STATE_CONNECTED);

  return {
    isReady,
  };
})(GrblWidget);

const Accordion = styled.div`
    > :not(:first-child) {
        border-top: 0;
    }
`;
