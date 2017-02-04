import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import store, { defaultState } from '../../../store';
import WidgetManager from './WidgetManager';

export const getActiveWidgets = () => {
    const defaultWidgets = store.get('workspace.container.default.widgets');
    const primaryWidgets = store.get('workspace.container.primary.widgets');
    const secondaryWidgets = store.get('workspace.container.secondary.widgets');
    const activeWidgets = _.concat(defaultWidgets, primaryWidgets, secondaryWidgets);

    return activeWidgets;
};

export const getInactiveWidgets = () => {
    const allWidgets = Object.keys(defaultState.widgets);
    const defaultWidgets = store.get('workspace.container.default.widgets');
    const primaryWidgets = store.get('workspace.container.primary.widgets');
    const secondaryWidgets = store.get('workspace.container.secondary.widgets');
    const inactiveWidgets = _.difference(allWidgets, defaultWidgets, primaryWidgets, secondaryWidgets);

    return inactiveWidgets;
};

// @param {string} targetContainer The target container: primary|secondary
export const show = (callback) => {
    const body = document.querySelector('body');
    const bodyStyle = {
        overflowY: ''
    };
    const el = document.body.appendChild(document.createElement('div'));
    const handleClose = (e) => {
        body.style.overflowY = bodyStyle.overflowY;

        ReactDOM.unmountComponentAtNode(el);
        setTimeout(() => {
            el.remove();
        }, 0);
    };

    // Prevent body from scrolling when a modal is opened
    bodyStyle.overflowY = body.style.overflowY;
    body.style.overflowY = 'hidden';

    ReactDOM.render(<WidgetManager onSave={callback} onClose={handleClose} />, el);
};
