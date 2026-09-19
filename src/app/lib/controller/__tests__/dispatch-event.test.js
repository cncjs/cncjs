import dispatchEvent from '../dispatch-event';

describe('dispatchEvent', () => {
    it('hands the event arguments to every listener', () => {
        const first = jest.fn();
        const second = jest.fn();

        dispatchEvent([first, second], ['COM3', { baudrate: 115200 }], jest.fn());

        expect(first).toHaveBeenCalledWith('COM3', { baudrate: 115200 });
        expect(second).toHaveBeenCalledWith('COM3', { baudrate: 115200 });
    });

    // The regression this exists for: a widget throwing inside
    // 'serialport:open' used to silence every widget registered after it, so a
    // broken console came out as a workspace that connected and could not be
    // jogged.
    it('keeps a throwing listener from silencing the ones behind it', () => {
        const before = jest.fn();
        const thrower = jest.fn(() => {
            throw new Error('widget is broken');
        });
        const after = jest.fn();

        dispatchEvent([before, thrower, after], [], jest.fn());

        expect(before).toHaveBeenCalled();
        expect(after).toHaveBeenCalled();
    });

    it('reports what the listener threw', () => {
        const onError = jest.fn();
        const err = new Error('widget is broken');

        dispatchEvent([() => {
            throw err;
        }], [], onError);

        expect(onError).toHaveBeenCalledWith(err);
    });

    it('reports every failure, not just the first', () => {
        const onError = jest.fn();

        dispatchEvent([
            () => {
                throw new Error('first');
            },
            () => {
                throw new Error('second');
            },
        ], [], onError);

        expect(onError).toHaveBeenCalledTimes(2);
    });

    it('does nothing when the event has no listeners', () => {
        expect(() => dispatchEvent(undefined, [], jest.fn())).not.toThrow();
    });
});
