import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import { GRBL, SMOOTHIE, TINYG } from '../../../constants';
import controller from '../../../lib/controller';
import store from '../../../store';
import defaultState from '../../../store/defaultState';
import WidgetManager from './WidgetManager';

export const getActiveWidgets = () => {
    const defaultWidgets = store.get('workspace.container.default.widgets', [])
        .map(widgetId => widgetId.split(':')[0]);
    const primaryWidgets = store.get('workspace.container.primary.widgets', [])
        .map(widgetId => widgetId.split(':')[0]);
    const secondaryWidgets = store.get('workspace.container.secondary.widgets', [])
        .map(widgetId => widgetId.split(':')[0]);
    const activeWidgets = _.union(defaultWidgets, primaryWidgets, secondaryWidgets)
        .filter(widget => {
            if (widget === 'grbl' && !_.includes(controller.availableControllers, GRBL)) {
                return false;
            }
            if (widget === 'smoothie' && !_.includes(controller.availableControllers, SMOOTHIE)) {
                return false;
            }
            if (widget === 'tinyg' && !_.includes(controller.availableControllers, TINYG)) {
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
    const inactiveWidgets = _.difference(allWidgets, defaultWidgets, primaryWidgets, secondaryWidgets)
        .filter(widget => {
            if (widget === 'grbl' && !_.includes(controller.availableControllers, GRBL)) {
                return false;
            }
            if (widget === 'smoothie' && !_.includes(controller.availableControllers, SMOOTHIE)) {
                return false;
            }
            if (widget === 'tinyg' && !_.includes(controller.availableControllers, TINYG)) {
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
