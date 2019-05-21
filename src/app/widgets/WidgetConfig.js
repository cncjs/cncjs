import store from '../store';

class WidgetConfig {
    widgetId = '';

    translateKey = (key) => {
        const widgetId = this.widgetId;
        if (typeof key !== 'undefined') {
            key = `widgets["${widgetId}"].${key}`;
        } else {
            key = `widgets["${widgetId}"]`;
        }
        return key;
    };

    constructor(widgetId) {
        this.widgetId = widgetId;
    }

    get(key, defaultValue) {
        if (!this.widgetId) {
            throw new Error('The widget id cannot be an empty string');
        }
        key = this.translateKey(key);
        return store.get(key, defaultValue);
    }

    set(key, value) {
        if (!this.widgetId) {
            throw new Error('The widget id cannot be an empty string');
        }
        key = this.translateKey(key);
        return store.set(key, value);
    }

    unset(key) {
        if (!this.widgetId) {
            throw new Error('The widget id cannot be an empty string');
        }
        key = this.translateKey(key);
        return store.unset(key);
    }

    replace(key, value) {
        if (!this.widgetId) {
            throw new Error('The widget id cannot be an empty string');
        }
        key = this.translateKey(key);
        return store.replace(key, value);
    }
}

export default WidgetConfig;
