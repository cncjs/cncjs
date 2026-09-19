import { ensureArray } from 'ensure-type';

/**
 * Hand an event to every listener registered for it.
 *
 * The obvious `listeners.forEach(listener => listener(...args))` abandons the
 * loop on the first exception, so everything registered after the thrower
 * never hears the event. That is how one broken widget turned into a workspace
 * that connected and was then entirely unjoggable, instead of one widget that
 * did not work.
 *
 * @param {function[]} listeners The listeners registered for the event.
 * @param {array} args The arguments the event carries.
 * @param {function} onError Called with whatever a listener threw.
 */
const dispatchEvent = (listeners, args, onError) => {
    ensureArray(listeners).forEach(listener => {
        try {
            listener(...args);
        } catch (err) {
            onError(err);
        }
    });
};

export default dispatchEvent;
