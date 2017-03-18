import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import { Dropdown, MenuItem } from 'react-bootstrap';
import RepeatButton from '../../components/RepeatButton';
import i18n from '../../lib/i18n';
import styles from './secondary-toolbar.styl';
import {
    CAMERA_MODE_PAN,
    CAMERA_MODE_ROTATE
} from './constants';

class SecondaryToolbar extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { state, actions } = this.props;

        return (
            <div className="pull-right">
                <div className="btn-toolbar">
                    <div className="btn-group btn-group-sm">
                        <RepeatButton
                            className={styles.btnIcon}
                            onClick={actions.camera.lookAtCenter}
                            title={i18n._('Reset Position')}
                        >
                            <i className={classNames(styles.icon, styles.iconFocusCenter)} />
                        </RepeatButton>
                        <RepeatButton
                            className={styles.btnIcon}
                            onClick={actions.camera.zoomIn}
                            title={i18n._('Zoom In')}
                        >
                            <i className={classNames(styles.icon, styles.iconZoomIn)} />
                        </RepeatButton>
                        <RepeatButton
                            className={styles.btnIcon}
                            onClick={actions.camera.zoomOut}
                            title={i18n._('Zoom Out')}
                        >
                            <i className={classNames(styles.icon, styles.iconZoomOut)} />
                        </RepeatButton>
                    </div>
                    <Dropdown
                        id="camera-mode-dropdown"
                        style={{ marginLeft: 0 }}
                        dropup
                        pullRight
                        onSelect={eventKey => {
                            if (eventKey === CAMERA_MODE_PAN) {
                                actions.camera.toPanMode();
                            } else if (eventKey === CAMERA_MODE_ROTATE) {
                                actions.camera.toRotateMode();
                            }
                        }}
                    >
                        <Dropdown.Toggle
                            noCaret
                            useAnchor
                            className={styles.btnIcon}
                        >
                            <i
                                className={classNames(
                                    'fa',
                                    'fa-fw',
                                    {
                                        'fa-rotate-right': (state.cameraMode === CAMERA_MODE_ROTATE),
                                        'fa-arrows': (state.cameraMode === CAMERA_MODE_PAN)
                                    }
                                )}
                                style={{ fontSize: 16, verticalAlign: 'top' }}
                            />
                            <span className="space space-xs" />
                            <i
                                className="fa fa-caret-up"
                                style={{ verticalAlign: 'top' }}
                            />
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <MenuItem eventKey={CAMERA_MODE_PAN}>
                                <i className="fa fa-fw fa-arrows" />
                                <span className="space space-sm" />
                                {i18n._('Move the camera')}
                            </MenuItem>
                            <MenuItem eventKey={CAMERA_MODE_ROTATE}>
                                <i className="fa fa-fw fa-rotate-right" />
                                <span className="space space-sm" />
                                {i18n._('Rotate the camera')}
                            </MenuItem>
                        </Dropdown.Menu>
                    </Dropdown>
                </div>
            </div>
        );
    }
}

export default SecondaryToolbar;
