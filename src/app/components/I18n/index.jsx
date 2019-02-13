import React from 'react';
import { Trans } from 'react-i18next';
import sha1 from 'sha1';
import env from 'app/config/env';
import i18next from 'app/i18next';
import log from 'app/lib/log';
import nodesToString from './nodes-to-string';

export default ({ children, ...props }) => {
    if (typeof children === 'function') {
        children = children(props);
    }

    let i18nKey = sha1(nodesToString('', children, 0));
    if (env.NODE_ENV === 'development') {
        log.trace(`i18nKey=${JSON.stringify(i18nKey)}`);
    }

    if (!i18next.exists(i18nKey)) {
        i18nKey = undefined;
    }

    return (
        <Trans i18nKey={i18nKey} {...props}>
            {children}
        </Trans>
    );
};
