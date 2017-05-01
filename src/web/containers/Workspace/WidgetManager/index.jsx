import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import { GRBL, SMOOTHIE, TINYG } from '../../../constants';
import controller from '../../../lib/controller';
import store, { defaultState } from '../../../store';
import WidgetManager from './WidgetManager';

export const getActiveWidgets = () => {
    const defaultWidgets = store.get('workspace.container.default.widgets');
    const primaryWidgets = store.get('workspace.container.primary.widgets');
    const secondaryWidgets = store.get('workspace.container.secondary.widgets');
    const activeWidgets = _.concat(defaultWidgets, primaryWidgets, secondaryWidgets)
        .filter(widgetid => {
            if (widgetid === 'grbl' && !_.includes(controller.loadedControllers, GRBL)) {
                return false;
            }
            if (widgetid === 'smoothie' && !_.includes(controller.loadedControllers, SMOOTHIE)) {
                return false;
            }
            if (widgetid === 'tinyg' && !_.includes(controller.loadedControllers, TINYG)) {
                return false;
            }
            return true;
        });

    return activeWidgets;
};

export const getInactiveWidgets = () => {
    const allWidgets = Object.keys(defaultState.widgets);
    const defaultWidgets = store.get('workspace.container.default.widgets');
    const primaryWidgets = store.get('workspace.container.primary.widgets');
    const secondaryWidgets = store.get('workspace.container.secondary.widgets');
    const inactiveWidgets = _.difference(allWidgets, defaultWidgets, primaryWidgets, secondaryWidgets)
        .filter(widget => {
            if (widget === 'grbl' && !_.includes(controller.loadedControllers, GRBL)) {
                return false;
            }
            if (widget === 'smoothie' && !_.includes(controller.loadedControllers, SMOOTHIE)) {
                return false;
            }
            if (widget === 'tinyg' && !_.includes(controller.loadedControllers, TINYG)) {
                return false;
            }
            return true;
        });

    return inactiveWidgets;
};

// @param {string} targetContainer The target container: primary|secondary
export const show = (callback) => {
    const el = document.body.appendChild(document.createElement('div'));
    const handleClose = (e) => {
        ReactDOM.unmountComponentAtNode(el);
        setTimeout(() => {
            el.remove();
        }, 0);
    };

    ReactDOM.render(<WidgetManager onSave={callback} onClose={handleClose} />, el);
};
