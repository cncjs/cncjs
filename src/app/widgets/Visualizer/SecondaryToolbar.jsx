import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Repeatable from 'react-repeatable';
import styled from 'styled-components';
import { Button, ButtonToolbar, ButtonGroup } from 'app/components/Buttons';
import Dropdown, { MenuItem } from 'app/components/Dropdown';
import Image from 'app/components/Image';
import Space from 'app/components/Space';
import { Tooltip } from 'app/components/Tooltip';
import i18n from 'app/lib/i18n';
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

    &:focus {
        box-shadow: none;
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
        state: PropTypes.object,
        actions: PropTypes.object
    };

    render() {
        const { state, actions } = this.props;
        const { cameraMode, cameraPosition } = state;
        const { camera } = actions;

        return (
            <ButtonToolbar className="pull-right">
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
                        btnStyle="default"
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
        );
    }
}

export default SecondaryToolbar;
