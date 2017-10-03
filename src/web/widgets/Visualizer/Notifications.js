import PropTypes from 'prop-types';
import React from 'react';
import Anchor from '../../components/Anchor';
import { ToastNotification } from '../../components/Notifications';
import i18n from '../../lib/i18n';
import {
    NOTIFICATION_CATEGORY_PROGRAM_PAUSE,
    NOTIFICATION_CATEGORY_PROGRAM_END,
    NOTIFICATION_CATEGORY_TOOL_CHANGE
} from './constants';

const Notifications = ({ category, ...props }) => {
    return (
        <div {...props}>
            {category === NOTIFICATION_CATEGORY_PROGRAM_PAUSE &&
            <ToastNotification
                type="info"
                onDismiss={() => {}}
            >
                <div><strong>{i18n._('M0, M1 Program Pause')}</strong></div>
                <div>{i18n._('Click the Resume button to resume program execution.')}</div>
            </ToastNotification>
            }
            {category === NOTIFICATION_CATEGORY_PROGRAM_END &&
            <ToastNotification
                type="info"
                onDismiss={() => {}}
            >
                <div><strong>{i18n._('M2, M30 Program End')}</strong></div>
                <div>{i18n._('Click the Stop button to stop program execution.')}</div>
            </ToastNotification>
            }
            {category === NOTIFICATION_CATEGORY_TOOL_CHANGE &&
            <ToastNotification
                type="info"
                onDismiss={() => {}}
            >
                <div><strong>{i18n._('M6 Tool Change')}</strong></div>
                <div>
                    {i18n._('Run a tool change macro to change the tool and adjust the Z-axis offset. Afterwards, click the Resume button to resume program execution.')}
                    <span style={{ marginLeft: 8 }} />
                    <Anchor
                        target="_blank"
                        href="https://github.com/cncjs/cncjs/wiki/M6-Tool-Change"
                    >
                        {i18n._('Learn More')}
                    </Anchor>
                </div>
            </ToastNotification>
            }
        </div>
    );
};

Notifications.propTypes = {
    category: PropTypes.string
};

export default Notifications;
