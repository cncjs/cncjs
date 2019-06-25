import difference from 'lodash/difference';
import includes from 'lodash/includes';
import union from 'lodash/union';
import React from 'react';
import ReactDOM from 'react-dom';
import { GRBL, MARLIN, SMOOTHIE, TINYG } from 'app/constants';
import controller from 'app/lib/controller';
import store from 'app/store';
import defaultState from 'app/store/defaultState';
import WidgetManager from './WidgetManager';

export const getActiveWidgets = () => {
    const defaultWidgets = store.get('workspace.container.default.widgets', [])
        .map(widgetId => widgetId.split(':')[0]);
    const primaryWidgets = store.get('workspace.container.primary.widgets', [])
        .map(widgetId => widgetId.split(':')[0]);
    const secondaryWidgets = store.get('workspace.container.secondary.widgets', [])
        .map(widgetId => widgetId.split(':')[0]);
    const activeWidgets = union(defaultWidgets, primaryWidgets, secondaryWidgets)
        .filter(widget => {
            if (widget === 'grbl' && !includes(controller.loadedControllers, GRBL)) {
                return false;
            }
            if (widget === 'marlin' && !includes(controller.loadedControllers, MARLIN)) {
                return false;
            }
            if (widget === 'smoothie' && !includes(controller.loadedControllers, SMOOTHIE)) {
                return false;
            }
            if (widget === 'tinyg' && !includes(controller.loadedControllers, TINYG)) {
                return false;
            }
            return true;
        });

    return activeWidgets;
};

export const getInactiveWidgets = () => {
    const allWidgets = Object.keys(defaultState.widgets);
    const defaultWidgets = store.get('workspace.container.default.widgets', [])
        .map(widgetId => widgetId.split(':')[0]);
    const primaryWidgets = store.get('workspace.container.primary.widgets', [])
        .map(widgetId => widgetId.split(':')[0]);
    const secondaryWidgets = store.get('workspace.container.secondary.widgets', [])
        .map(widgetId => widgetId.split(':')[0]);
    const inactiveWidgets = difference(allWidgets, defaultWidgets, primaryWidgets, secondaryWidgets)
        .filter(widget => {
            if (widget === 'grbl' && !includes(controller.loadedControllers, GRBL)) {
                return false;
            }
            if (widget === 'marlin' && !includes(controller.loadedControllers, MARLIN)) {
                return false;
            }
            if (widget === 'smoothie' && !includes(controller.loadedControllers, SMOOTHIE)) {
                return false;
            }
            if (widget === 'tinyg' && !includes(controller.loadedControllers, TINYG)) {
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
