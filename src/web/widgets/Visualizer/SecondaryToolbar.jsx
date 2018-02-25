import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Repeatable from 'react-repeatable';
import Anchor from '../../components/Anchor';
import { Button, ButtonToolbar, ButtonGroup } from '../../components/Buttons';
import Dropdown, { MenuItem } from '../../components/Dropdown';
import Image from '../../components/Image';
import Space from '../../components/Space';
import { Tooltip } from '../../components/Tooltip';
import i18n from '../../lib/i18n';
import styles from './index.styl';
import iconTopView from './images/3d-top-view.svg';
import iconIsometricView from './images/3d-isometric-view.svg';
import iconFrontView from './images/3d-front-view.svg';
import iconSideView from './images/3d-side-view.svg';
import iconZoomFit from './images/zoom-fit.svg';
import iconZoomIn from './images/zoom-in.svg';
import iconZoomOut from './images/zoom-out.svg';
import iconMove from './images/3d-move.svg';
import iconRotate from './images/3d-rotate.svg';
import {
    CAMERA_MODE_PAN,
    CAMERA_MODE_ROTATE
} from './constants';

class SecondaryToolbar extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    render() {
        const { state, actions } = this.props;
        const { cameraMode, cameraView } = state;
        const { camera } = actions;

        return (
            <div className={styles.secondaryToolbar}>
                <ButtonToolbar className="pull-right">
                    <ButtonGroup btnSize="sm">
                        <Button
                            className={cx(styles.btnIcon, {
                                [styles.highlight]: cameraView === 'top'
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
                        </Button>
                        <Button
                            className={cx(styles.btnIcon, {
                                [styles.highlight]: cameraView === 'isometric'
                            })}
                            onClick={camera.toIsometricView}
                        >
                            <Tooltip
                                placement="top"
                                content={i18n._('Isometric View')}
                                hideOnClick
                            >
                                <Image src={iconIsometricView} width="20" height="20" />
                            </Tooltip>
                        </Button>
                        <Button
                            className={cx(styles.btnIcon, {
                                [styles.highlight]: cameraView === 'front'
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
                        </Button>
                        <Button
                            className={cx(styles.btnIcon, {
                                [styles.highlight]: cameraView === 'side'
                            })}
                            onClick={camera.toSideView}
                        >
                            <Tooltip
                                placement="top"
                                content={i18n._('Side View')}
                                hideOnClick
                            >
                                <Image src={iconSideView} width="20" height="20" />
                            </Tooltip>
                        </Button>
                        <Repeatable
                            className={styles.btnIcon}
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
                            className={styles.btnIcon}
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
                            className={styles.btnIcon}
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
                            componentClass={Anchor}
                            className={styles.btnIcon}
                        >
                            {(cameraMode === CAMERA_MODE_PAN) &&
                                <Image src={iconMove} width="20" height="20" />
                            }
                            {(cameraMode === CAMERA_MODE_ROTATE) &&
                                <Image src={iconRotate} width="20" height="20" />
                            }
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <MenuItem eventKey={CAMERA_MODE_PAN}>
                                <Image src={iconMove} width="20" height="20" />
                                <Space width="4" />
                                {i18n._('Move the camera')}
                            </MenuItem>
                            <MenuItem eventKey={CAMERA_MODE_ROTATE}>
                                <Image src={iconRotate} width="20" height="20" />
                                <Space width="4" />
                                {i18n._('Rotate the camera')}
                            </MenuItem>
                        </Dropdown.Menu>
                    </Dropdown>
                </ButtonToolbar>
            </div>
        );
    }
}

export default SecondaryToolbar;
