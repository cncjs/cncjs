import cx from 'classnames';
import _find from 'lodash/find';
import _get from 'lodash/get';
import _isEqual from 'lodash/isEqual';
import { ensureArray } from 'ensure-type';
import PropTypes from 'prop-types';
import pubsub from 'pubsub-js';
import React, { PureComponent } from 'react';
import Repeatable from 'react-repeatable';
import styled from 'styled-components';
import { Button, ButtonToolbar, ButtonGroup } from 'app/components/Buttons';
import Dropdown, { MenuItem } from 'app/components/Dropdown';
import { FlexContainer, Row, Col } from 'app/components/GridSystem';
import Image from 'app/components/Image';
import Space from 'app/components/Space';
import { Tooltip } from 'app/components/Tooltip';
import api from 'app/api';
import i18n from 'app/lib/i18n';
import store from 'app/store';
import iconTopView from './images/camera-top-view.png';
import icon3DView from './images/camera-3d-view.svg';
import iconFrontView from './images/camera-front-view.png';
import iconLeftSideView from './images/camera-left-side-view.png';
import iconRightSideView from './images/camera-right-side-view.png';
import iconZoomFit from './images/zoom-fit.svg';
import iconZoomIn from './images/zoom-in.svg';
import iconZoomOut from './images/zoom-out.svg';
import iconMoveCamera from './images/move-camera.svg';
import iconRotateCamera from './images/rotate-camera.svg';
import {
  CAMERA_MODE_PAN,
  CAMERA_MODE_ROTATE
} from './constants';

const IconButton = styled(Button)`
    display: inline-block;
    padding: 8px;
    margin-bottom: 0;
    font-weight: normal;
    text-align: center;
    white-space: nowrap;
    touch-action: manipulation;
    cursor: pointer;
    user-select: none;
    background-image: none;
    background-color: inherit;

    && {
        border: 0;
        border-radius: 0;
    }

    filter: invert(40%);

    &.highlight,
    &:hover.highlight {
        background-image: none;
        background-color: rgba(255, 255, 255, .7);
        outline: 0;
        color: #333;
        text-decoration: none;
        filter: invert(100%);
    }

    &:hover {
        background-image: none;
        background-color: #e6e6e6;
        filter: invert(0%);
    }

    &:hover,
    &:focus,
    &:active {
        outline: 0;
        color: #333;
        text-decoration: none;
    }

    min-width: 36px; // 8px + 20px + 8px
    height: 36px; // 8px + 20px + 8px

    & + & {
        margin-left: 0;
    }
`;

class SecondaryToolbar extends PureComponent {
    static propTypes = {
      is3DView: PropTypes.bool,
      cameraMode: PropTypes.oneOf([
        CAMERA_MODE_PAN,
        CAMERA_MODE_ROTATE,
      ]),
      cameraPosition: PropTypes.oneOf(['top', '3d', 'front', 'left', 'right']),
      camera: PropTypes.object,
    };

    state = {
      machineProfile: store.get('workspace.machineProfile'),
      machineProfiles: []
    };

    pubsubTokens = [];

    fetchMachineProfiles = async () => {
      try {
        const res = await api.machines.fetch();
        const { records: machineProfiles } = res.body;

        this.setState({
          machineProfiles: ensureArray(machineProfiles)
        });
      } catch (err) {
        // Ignore
      }
    };

    updateMachineProfileFromStore = () => {
      const machineProfile = store.get('workspace.machineProfile');
      if (!machineProfile || _isEqual(machineProfile, this.state.machineProfile)) {
        return;
      }

      this.setState({ machineProfile });
    };

    updateMachineProfilesFromSubscriber = (machineProfiles) => {
      this.setState({
        machineProfiles: ensureArray(machineProfiles)
      });
    };

    changeMachineProfileById = (id) => {
      const machineProfile = _find(this.state.machineProfiles, { id });
      if (machineProfile) {
        store.replace('workspace.machineProfile', machineProfile);
      }
    };

    subscribe() {
      const tokens = [
        pubsub.subscribe('updateMachineProfiles', (msg, machineProfiles) => {
          this.updateMachineProfilesFromSubscriber(machineProfiles);
        })
      ];
      this.pubsubTokens = this.pubsubTokens.concat(tokens);
    }

    unsubscribe() {
      this.pubsubTokens.forEach((token) => {
        pubsub.unsubscribe(token);
      });
      this.pubsubTokens = [];
    }

    componentDidMount() {
      store.on('change', this.updateMachineProfileFromStore);
      this.subscribe();

      this.fetchMachineProfiles();
    }

    componentWillUnmount() {
      store.removeListener('change', this.updateMachineProfileFromStore);
      this.unsubscribe();
    }

    render() {
      const { is3DView, cameraMode, cameraPosition, camera } = this.props;
      const { machineProfile, machineProfiles } = this.state;
      const selectedMachineProfile = _find(machineProfiles, {
        id: _get(machineProfile, 'id')
      });
      const selectedMachineProfileId = _get(selectedMachineProfile, 'id');
      const selectedMachineProfileName = _get(selectedMachineProfile, 'name');

      return (
        <FlexContainer fluid>
          <Row
            style={{
              justifyContent: 'space-between',
              flexWrap: 'nowrap',
            }}
          >
            <Col width="auto">
              {is3DView && (
                <ButtonToolbar>
                  <ButtonGroup btnSize="sm">
                    <IconButton
                      className={cx({
                        'highlight': cameraPosition === 'top'
                      })}
                      onClick={camera.toTopView}
                    >
                      <Tooltip
                        placement="top"
                        content={i18n._('Top View')}
                        hideOnClick
                      >
                        <Image src={iconTopView} width="20" height="20" />
                      </Tooltip>
                    </IconButton>
                    <IconButton
                      className={cx({
                        'highlight': cameraPosition === 'front'
                      })}
                      onClick={camera.toFrontView}
                    >
                      <Tooltip
                        placement="top"
                        content={i18n._('Front View')}
                        hideOnClick
                      >
                        <Image src={iconFrontView} width="20" height="20" />
                      </Tooltip>
                    </IconButton>
                    <IconButton
                      className={cx({
                        'highlight': cameraPosition === 'right'
                      })}
                      onClick={camera.toRightSideView}
                    >
                      <Tooltip
                        placement="top"
                        content={i18n._('Right Side View')}
                        hideOnClick
                      >
                        <Image src={iconRightSideView} width="20" height="20" />
                      </Tooltip>
                    </IconButton>
                    <IconButton
                      className={cx({
                        'highlight': cameraPosition === 'left'
                      })}
                      onClick={camera.toLeftSideView}
                    >
                      <Tooltip
                        placement="top"
                        content={i18n._('Left Side View')}
                        hideOnClick
                      >
                        <Image src={iconLeftSideView} width="20" height="20" />
                      </Tooltip>
                    </IconButton>
                    <IconButton
                      className={cx({
                        'highlight': cameraPosition === '3d'
                      })}
                      onClick={camera.to3DView}
                    >
                      <Tooltip
                        placement="top"
                        content={i18n._('3D View')}
                        hideOnClick
                      >
                        <Image src={icon3DView} width="20" height="20" />
                      </Tooltip>
                    </IconButton>
                    <Repeatable
                      componentClass={IconButton}
                      onClick={camera.zoomFit}
                      onHold={camera.zoomFit}
                    >
                      <Tooltip
                        placement="top"
                        content={i18n._('Zoom to Fit')}
                        hideOnClick
                      >
                        <Image src={iconZoomFit} width="20" height="20" />
                      </Tooltip>
                    </Repeatable>
                    <Repeatable
                      componentClass={IconButton}
                      onClick={camera.zoomIn}
                      onHold={camera.zoomIn}
                    >
                      <Tooltip
                        placement="top"
                        content={i18n._('Zoom In')}
                        hideOnClick
                      >
                        <Image src={iconZoomIn} width="20" height="20" />
                      </Tooltip>
                    </Repeatable>
                    <Repeatable
                      componentClass={IconButton}
                      onClick={camera.zoomOut}
                      onHold={camera.zoomOut}
                    >
                      <Tooltip
                        placement="top"
                        content={i18n._('Zoom Out')}
                        hideOnClick
                      >
                        <Image src={iconZoomOut} width="20" height="20" />
                      </Tooltip>
                    </Repeatable>
                  </ButtonGroup>
                  <Dropdown
                    componentClass={ButtonGroup}
                    style={{ marginLeft: 0 }}
                    dropup
                    pullRight
                    onSelect={eventKey => {
                      if (eventKey === CAMERA_MODE_PAN) {
                        camera.toPanMode();
                      } else if (eventKey === CAMERA_MODE_ROTATE) {
                        camera.toRotateMode();
                      }
                    }}
                  >
                    <Dropdown.Toggle
                      componentClass={IconButton}
                    >
                      {(cameraMode === CAMERA_MODE_PAN) &&
                        <Image src={iconMoveCamera} width="20" height="20" />
                      }
                      {(cameraMode === CAMERA_MODE_ROTATE) &&
                        <Image src={iconRotateCamera} width="20" height="20" />
                      }
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <MenuItem eventKey={CAMERA_MODE_PAN}>
                        <Image src={iconMoveCamera} width="20" height="20" />
                        <Space width="4" />
                        {i18n._('Move the camera')}
                      </MenuItem>
                      <MenuItem eventKey={CAMERA_MODE_ROTATE}>
                        <Image src={iconRotateCamera} width="20" height="20" />
                        <Space width="4" />
                        {i18n._('Rotate the camera')}
                      </MenuItem>
                    </Dropdown.Menu>
                  </Dropdown>
                </ButtonToolbar>
              )}
            </Col>
            <Col width="auto">
              {(machineProfiles.length > 0) && (
                <Dropdown
                  componentClass={ButtonGroup}
                  style={{ marginLeft: 0 }}
                  dropup
                  pullRight
                  onSelect={(eventKey) => {
                    const id = eventKey;
                    this.changeMachineProfileById(id);
                  }}
                >
                  <Dropdown.Toggle
                    componentClass={IconButton}
                  >
                    {!!selectedMachineProfile && (
                      <div
                        style={{
                          display: 'inline-block',
                          maxWidth: 120,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          verticalAlign: 'top',
                        }}
                        title={selectedMachineProfileName}
                      >
                        {selectedMachineProfileName}
                      </div>
                    )}
                    {!selectedMachineProfile && (
                      i18n._('No machine profile selected')
                    )}
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <MenuItem header>
                      {i18n._('Machine Profiles')}
                    </MenuItem>
                    {machineProfiles.map(({ id, name }) => (
                      <MenuItem
                        active={id === selectedMachineProfileId}
                        key={id}
                        eventKey={id}
                        title={name}
                      >
                        <div
                          style={{
                            display: 'inline-block',
                            verticalAlign: 'top',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: 240,
                          }}
                        >
                          {name}
                        </div>
                      </MenuItem>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
              )}
            </Col>
          </Row>
        </FlexContainer>
      );
    }
}

export default SecondaryToolbar;
