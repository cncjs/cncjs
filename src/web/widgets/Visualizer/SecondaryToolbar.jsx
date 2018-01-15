import cx from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Repeatable from 'react-repeatable';
import Anchor from '../../components/Anchor';
import { ButtonToolbar, ButtonGroup } from '../../components/Buttons';
import Dropdown, { MenuItem } from '../../components/Dropdown';
import Space from '../../components/Space';
import i18n from '../../lib/i18n';
import styles from './index.styl';
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
        const { cameraMode } = state;
        const { camera } = actions;

        return (
            <div className={styles.secondaryToolbar}>
                <ButtonToolbar className="pull-right">
                    <ButtonGroup btnSize="sm">
                        <Repeatable
                            className={styles.btnIcon}
                            onClick={camera.lookAtCenter}
                            onHold={camera.lookAtCenter}
                            title={i18n._('Reset Position')}
                        >
                            <i className={cx(styles.icon, styles.iconFocusCenter)} />
                        </Repeatable>
                        <Repeatable
                            className={styles.btnIcon}
                            onClick={camera.zoomIn}
                            onHold={camera.zoomIn}
                            title={i18n._('Zoom In')}
                        >
                            <i className={cx(styles.icon, styles.iconZoomIn)} />
                        </Repeatable>
                        <Repeatable
                            className={styles.btnIcon}
                            onClick={camera.zoomOut}
                            onHold={camera.zoomOut}
                            title={i18n._('Zoom Out')}
                        >
                            <i className={cx(styles.icon, styles.iconZoomOut)} />
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
                            <i
                                className={cx('fa', 'fa-fw', {
                                    'fa-rotate-right': (cameraMode === CAMERA_MODE_ROTATE),
                                    'fa-arrows': (cameraMode === CAMERA_MODE_PAN)
                                })}
                                style={{ fontSize: 16, verticalAlign: 'top' }}
                            />
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <MenuItem eventKey={CAMERA_MODE_PAN}>
                                <i className="fa fa-fw fa-arrows" />
                                <Space width="4" />
                                {i18n._('Move the camera')}
                            </MenuItem>
                            <MenuItem eventKey={CAMERA_MODE_ROTATE}>
                                <i className="fa fa-fw fa-rotate-right" />
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
