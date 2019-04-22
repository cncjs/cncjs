import PropTypes from 'prop-types';
import React from 'react';
import Anchor from 'app/components/Anchor';
import { ToastNotification } from 'app/components/Notifications';
import Space from 'app/components/Space';
import i18n from 'app/lib/i18n';
import {
    NOTIFICATION_PROGRAM_ERROR,
    NOTIFICATION_M0_PROGRAM_PAUSE,
    NOTIFICATION_M1_PROGRAM_PAUSE,
    NOTIFICATION_M2_PROGRAM_END,
    NOTIFICATION_M30_PROGRAM_END,
    NOTIFICATION_M6_TOOL_CHANGE,
    NOTIFICATION_M109_SET_EXTRUDER_TEMPERATURE,
    NOTIFICATION_M190_SET_HEATED_BED_TEMPERATURE
} from './constants';

const Notifications = ({ show, type, data, onDismiss, style, ...props }) => (
    <div
        {...props}
        style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            ...style
        }}
    >
        <ToastNotification
            {...props}
            show={show}
            type={{
                [NOTIFICATION_PROGRAM_ERROR]: 'error',
                [NOTIFICATION_M0_PROGRAM_PAUSE]: 'info',
                [NOTIFICATION_M1_PROGRAM_PAUSE]: 'info',
                [NOTIFICATION_M2_PROGRAM_END]: 'success',
                [NOTIFICATION_M30_PROGRAM_END]: 'success',
                [NOTIFICATION_M6_TOOL_CHANGE]: 'info',
                [NOTIFICATION_M109_SET_EXTRUDER_TEMPERATURE]: 'warning',
                [NOTIFICATION_M190_SET_HEATED_BED_TEMPERATURE]: 'warning'
            }[type]}
            onDismiss={onDismiss}
        >
            {type === NOTIFICATION_PROGRAM_ERROR &&
            <div>
                <div><strong>{i18n._('Error')}</strong></div>
                <div>{i18n._('Click the Resume button to resume program execution.')}</div>
            </div>
            }
            {type === NOTIFICATION_M0_PROGRAM_PAUSE &&
            <div>
                <div><strong>{i18n._('M0 Program Pause')}</strong></div>
                <div>{i18n._('Click the Resume button to resume program execution.')}</div>
            </div>
            }
            {type === NOTIFICATION_M1_PROGRAM_PAUSE &&
            <div>
                <div><strong>{i18n._('M1 Program Pause')}</strong></div>
                <div>{i18n._('Click the Resume button to resume program execution.')}</div>
            </div>
            }
            {type === NOTIFICATION_M2_PROGRAM_END &&
            <div>
                <div><strong>{i18n._('M2 Program End')}</strong></div>
                <div>{i18n._('Click the Stop button to stop program execution.')}</div>
            </div>
            }
            {type === NOTIFICATION_M30_PROGRAM_END &&
            <div>
                <div><strong>{i18n._('M30 Program End')}</strong></div>
                <div>{i18n._('Click the Stop button to stop program execution.')}</div>
            </div>
            }
            {type === NOTIFICATION_M6_TOOL_CHANGE &&
            <div>
                <div><strong>{i18n._('M6 Tool Change')}</strong></div>
                <div>
                    {i18n._('Run a tool change macro to change the tool and adjust the Z-axis offset. Afterwards, click the Resume button to resume program execution.')}
                    <Space width="4" />
                    <Anchor
                        target="_blank"
                        href="https://github.com/cncjs/cncjs/wiki/Tool-Change"
                    >
                        {i18n._('Learn more')}
                    </Anchor>
                </div>
            </div>
            }
            {type === NOTIFICATION_M109_SET_EXTRUDER_TEMPERATURE &&
            <div>
                <div><strong>{i18n._('M109 Set Extruder Temperature')}</strong></div>
                <div>{i18n._('Waiting for the target temperature to be reached...')}</div>
            </div>
            }
            {type === NOTIFICATION_M190_SET_HEATED_BED_TEMPERATURE &&
            <div>
                <div><strong>{i18n._('M190 Set Heated Bed Temperature')}</strong></div>
                <div>{i18n._('Waiting for the target temperature to be reached...')}</div>
            </div>
            }
        </ToastNotification>
    </div>
);

Notifications.propTypes = {
    show: PropTypes.bool,
    type: PropTypes.string,
    data: PropTypes.any,
    onDismiss: PropTypes.func
};

export default Notifications;
