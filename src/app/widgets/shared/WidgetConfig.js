import config from 'app/store/config';
import { translatePathByWidgetId } from './utils';

class WidgetConfig {
    widgetId = '';

    constructor(widgetId) {
      if (!widgetId) {
        throw new TypeError(`"widgetId" is not defined: ${widgetId}`);
      }

      this.widgetId = widgetId;
      this.translatePath = translatePathByWidgetId(this.widgetId);
    }

    get(path, defaultValue) {
      return config.get(this.translatePath(path), defaultValue);
    }

    set(path, value) {
      return config.set(this.translatePath(path), value);
    }

    unset(path) {
      return config.unset(this.translatePath(path));
    }

    update(path, updater) {
      return config.updater(this.translatePath(path), updater);
    }
}

export default WidgetConfig;
