import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  ButtonGroup,
  Dropdown,
  DropdownButton,
  Flex,
  Space,
  Tooltip,
} from '@tonic-ui/react';
import { ensureArray } from 'ensure-type';
import _get from 'lodash/get';
import _isEqual from 'lodash/isEqual';
import pubsub from 'pubsub-js';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import i18n from '@app/lib/i18n';
import config from '@app/store/config';
import {
  API_MACHINES_QUERY_KEY,
  useFetchMachinesQuery,
} from '@app/pages/Administration/Machines/queries';
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
} from './constants';

const REPEAT_DELAY = 500;
const REPEAT_INTERVAL = Math.floor(1000 / 15);
const CLEAR_MACHINE_PROFILE = '__clear__';

/**
 * @param {Function} onAction
 * @param {boolean} disabled
 * @returns {object}
 */
function useRepeatable(onAction, disabled) {
  const delayTimer = useRef(null);
  const intervalTimer = useRef(null);
  const active = useRef(false);
  const action = useRef(onAction);
  const releaseHandler = useRef(null);

  useEffect(() => {
    action.current = onAction;
  }, [onAction]);

  const clear = useCallback(() => {
    if (delayTimer.current) {
      clearTimeout(delayTimer.current);
      delayTimer.current = null;
    }
    if (intervalTimer.current) {
      clearInterval(intervalTimer.current);
      intervalTimer.current = null;
    }
    if (releaseHandler.current) {
      document.documentElement.removeEventListener('mouseup', releaseHandler.current);
      releaseHandler.current = null;
    }
    active.current = false;
  }, []);

  const release = useCallback(() => {
    if (!active.current || disabled) {
      return;
    }
    clear();
    action.current();
  }, [clear, disabled]);

  const start = useCallback(() => {
    if (disabled) {
      return;
    }
    clear();
    active.current = true;
    releaseHandler.current = release;
    document.documentElement.addEventListener('mouseup', release);
    delayTimer.current = setTimeout(() => {
      if (!active.current) {
        return;
      }
      action.current();
      intervalTimer.current = setInterval(() => {
        if (active.current) {
          action.current();
        }
      }, REPEAT_INTERVAL);
    }, REPEAT_DELAY);
  }, [clear, disabled, release]);

  useEffect(() => {
    if (disabled) {
      clear();
    }
    return clear;
  }, [clear, disabled]);

  return {
    onMouseDown: start,
    onTouchStart: start,
    onTouchCancel: release,
    onTouchEnd: release,
    onBlur: clear,
  };
}

/**
 * @param {{ src: string }} props
 */
function CameraIcon({ src }) {
  return (
    <Box
      as="span"
      role="img"
      aria-hidden="true"
      display="inline-block"
      flexShrink={0}
      width="20px"
      height="20px"
      sx={{
        backgroundColor: 'currentColor',
        mask: `url("${src}") center / contain no-repeat`,
        WebkitMask: `url("${src}") center / contain no-repeat`,
      }}
    />
  );
}

/**
 * @param {{ children?: React.ReactNode, label: string, onClick: Function, selected?: boolean }} props
 */
function CameraIconButton({ children, label, onClick, selected = false }) {
  return (
    <Tooltip label={label} placement="top">
      <Button
        aria-label={label}
        onClick={onClick}
        aria-pressed={selected}
        variant="ghost"
        sx={{
          display: 'inline-flex',
          backgroundColor: selected ? '_foreground.subtle.selected' : 'transparent',
          height: '32px',
          minWidth: '32px',
          padding: '6px',
          width: '32px',
        }}
      >
        {children}
      </Button>
    </Tooltip>
  );
}

/**
 * @param {{ children?: React.ReactNode, label: string, onClick: Function }} props
 */
function RepeatableCameraButton({ children, label, onClick }) {
  const repeatableProps = useRepeatable(onClick, false);
  const handleKeyDown = event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <Tooltip label={label} placement="top">
      <Button
        {...repeatableProps}
        aria-label={label}
        onKeyDown={handleKeyDown}
        variant="ghost"
        sx={{
          display: 'inline-flex',
          height: '32px',
          minWidth: '32px',
          padding: '6px',
          width: '32px',
        }}
      >
        {children}
      </Button>
    </Tooltip>
  );
}

/**
 * @param {{ is3DView?: boolean, cameraMode?: string, cameraPosition?: string, camera?: object }} props
 */
function SecondaryToolbar({
  is3DView = false,
  cameraMode = CAMERA_MODE_PAN,
  cameraPosition = 'top',
  camera = {},
}) {
  const queryClient = useQueryClient();
  const machineProfilesQuery = useFetchMachinesQuery();
  const machineProfiles = ensureArray(machineProfilesQuery.data?.records);
  const [machineProfile, setMachineProfile] = useState(() => config.get('workspace.machineProfile'));
  const selectedMachineProfile = machineProfiles.find(({ id }) => id === _get(machineProfile, 'id'));

  useEffect(() => {
    const updateMachineProfileFromStore = () => {
      const nextMachineProfile = config.get('workspace.machineProfile');
      setMachineProfile(previous => (_isEqual(nextMachineProfile, previous) ? previous : nextMachineProfile));
    };

    config.on('change', updateMachineProfileFromStore);
    return () => {
      config.removeListener('change', updateMachineProfileFromStore);
    };
  }, []);

  useEffect(() => {
    const token = pubsub.subscribe('updateMachineProfiles', () => {
      queryClient.invalidateQueries({ queryKey: API_MACHINES_QUERY_KEY });
    });

    return () => {
      pubsub.unsubscribe(token);
    };
  }, [queryClient]);

  const changeMachineProfileById = useCallback((id) => {
    const nextMachineProfile = machineProfiles.find(profile => profile.id === id);
    if (nextMachineProfile) {
      config.set('workspace.machineProfile', nextMachineProfile);
    }
  }, [machineProfiles]);

  const clearMachineProfile = useCallback(() => {
    config.set('workspace.machineProfile', { id: null });
  }, []);

  const selectMachineProfile = useCallback((id) => {
    if (id === CLEAR_MACHINE_PROFILE) {
      clearMachineProfile();
      return;
    }
    changeMachineProfileById(id);
  }, [changeMachineProfileById, clearMachineProfile]);

  return (
    <Flex
      aria-label="Visualizer camera toolbar"
      role="toolbar"
      alignItems="center"
      justifyContent="space-between"
      flexWrap="wrap"
      gap="2x"
      sx={{ '& button:focus-visible': { color: 'text.accent' } }}
    >
      <Box width="auto">
        {is3DView && (
          <Flex alignItems="center" gap="1x">
            <ButtonGroup>
              <CameraIconButton
                label={i18n._('Top View')}
                selected={cameraPosition === 'top'}
                onClick={camera.toTopView}
              >
                <CameraIcon src={iconTopView} />
              </CameraIconButton>
              <CameraIconButton
                label={i18n._('Front View')}
                selected={cameraPosition === 'front'}
                onClick={camera.toFrontView}
              >
                <CameraIcon src={iconFrontView} />
              </CameraIconButton>
              <CameraIconButton
                label={i18n._('Right Side View')}
                selected={cameraPosition === 'right'}
                onClick={camera.toRightSideView}
              >
                <CameraIcon src={iconRightSideView} />
              </CameraIconButton>
              <CameraIconButton
                label={i18n._('Left Side View')}
                selected={cameraPosition === 'left'}
                onClick={camera.toLeftSideView}
              >
                <CameraIcon src={iconLeftSideView} />
              </CameraIconButton>
              <CameraIconButton
                label={i18n._('3D View')}
                selected={cameraPosition === '3d'}
                onClick={camera.to3DView}
              >
                <CameraIcon src={icon3DView} />
              </CameraIconButton>
              <RepeatableCameraButton
                label={i18n._('Zoom to Fit')}
                onClick={camera.zoomFit}
              >
                <CameraIcon src={iconZoomFit} />
              </RepeatableCameraButton>
              <RepeatableCameraButton
                label={i18n._('Zoom In')}
                onClick={camera.zoomIn}
              >
                <CameraIcon src={iconZoomIn} />
              </RepeatableCameraButton>
              <RepeatableCameraButton
                label={i18n._('Zoom Out')}
                onClick={camera.zoomOut}
              >
                <CameraIcon src={iconZoomOut} />
              </RepeatableCameraButton>
            </ButtonGroup>
            <Dropdown
              placement="top-start"
              items={[
                {
                  value: 'pan',
                  content: (
                    <>
                      <CameraIcon src={iconMoveCamera} />
                      <Space width="1x" />
                      {i18n._('Move the camera')}
                    </>
                  ),
                  props: { onClick: camera.toPanMode },
                },
                {
                  value: 'rotate',
                  content: (
                    <>
                      <CameraIcon src={iconRotateCamera} />
                      <Space width="1x" />
                      {i18n._('Rotate the camera')}
                    </>
                  ),
                  props: { onClick: camera.toRotateMode },
                },
              ]}
              renderItem={item => item?.content}
              renderToggle={() => (
                <DropdownButton
                  aria-label={cameraMode === CAMERA_MODE_PAN ? i18n._('Camera mode: Pan') : i18n._('Camera mode: Rotate')}
                  variant="ghost"
                  sx={{ minWidth: '56px', width: '56px', height: '32px', padding: '6px' }}
                >
                  <CameraIcon src={cameraMode === CAMERA_MODE_PAN ? iconMoveCamera : iconRotateCamera} />
                </DropdownButton>
              )}
            />
          </Flex>
        )}
      </Box>
      <Box width="auto">
        {machineProfiles.length > 0 && (
          <Dropdown
            placement="top-end"
            items={[
              {
                value: 'heading',
                type: 'custom',
                content: (
                  <Box px="3x" py="2x" fontWeight="bold">
                    {i18n._('Machine Profiles')}
                  </Box>
                ),
              },
              {
                value: CLEAR_MACHINE_PROFILE,
                content: i18n._('None'),
                props: {
                  selected: !selectedMachineProfile,
                  onClick: () => selectMachineProfile(CLEAR_MACHINE_PROFILE),
                },
              },
              { type: 'divider' },
              ...machineProfiles.map(({ id, name }) => ({
                value: id,
                content: (
                  <Box
                    as="span"
                    sx={{
                      display: 'inline-block',
                      maxWidth: 240,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      verticalAlign: 'top',
                    }}
                  >
                    {name}
                  </Box>
                ),
                props: {
                  selected: id === _get(machineProfile, 'id'),
                  onClick: () => selectMachineProfile(id),
                  title: name,
                },
              })),
            ]}
            renderItem={item => item?.content}
            renderToggle={() => (
              <DropdownButton
                aria-label={i18n._('Select machine profile')}
                variant="ghost"
                sx={{ minWidth: '36px', padding: '8px' }}
              >
                {selectedMachineProfile ? (
                  <Box
                    as="span"
                    title={selectedMachineProfile.name}
                    sx={{
                      display: 'inline-block',
                      maxWidth: 120,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      verticalAlign: 'top',
                    }}
                  >
                    {selectedMachineProfile.name}
                  </Box>
                ) : i18n._('No machine profile selected')}
              </DropdownButton>
            )}
          />
        )}
      </Box>
    </Flex>
  );
}

export default SecondaryToolbar;
