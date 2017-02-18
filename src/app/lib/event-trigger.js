import config from '../services/configstore';
import log from './log';

const noop = () => {};

class EventTrigger {
    constructor(callback = noop) {
        this.callback = callback || noop;
    }
    trigger(eventKey, callback = null) {
        if (!eventKey) {
            log.error('The event is undefined');
            return;
        }

        const events = config.get('events', []);

        events
            .filter(event => event && event.event === eventKey)
            .forEach(({ enabled = false, event, trigger, command }) => {
                if (!enabled || !trigger || !command) {
                    return;
                }

                if (typeof this.callback === 'function') {
                    this.callback(event, trigger, command);
                }
            });
    }
}

export default EventTrigger;
