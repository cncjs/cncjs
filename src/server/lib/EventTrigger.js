import config from '../services/configstore';

const noop = () => {};

class EventTrigger {
    constructor(callback = noop) {
        this.callback = callback || noop;
    }

    trigger(eventKey, callback = null) {
        if (!eventKey) {
            return;
        }

        const events = config.get('events', []);

        events
            .filter(event => event && event.event === eventKey)
            .forEach(options => {
                const {
                    enabled = false,
                    event,
                    trigger,
                    commands
                } = { ...options };

                if (!enabled) {
                    return;
                }

                if (typeof this.callback === 'function') {
                    this.callback(event, trigger, commands);
                }
            });
    }
}

export default EventTrigger;
