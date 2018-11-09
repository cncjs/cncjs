import config from 'app/store/config';

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
        return config.get(key, defaultValue);
    }
    set(key, value) {
        if (!this.widgetId) {
            throw new Error('The widget id cannot be an empty string');
        }
        key = this.translateKey(key);
        return config.set(key, value);
    }
    unset(key) {
        if (!this.widgetId) {
            throw new Error('The widget id cannot be an empty string');
        }
        key = this.translateKey(key);
        return config.unset(key);
    }
    replace(key, value) {
        if (!this.widgetId) {
            throw new Error('The widget id cannot be an empty string');
        }
        key = this.translateKey(key);
        return config.replace(key, value);
    }
}

export default WidgetConfig;
