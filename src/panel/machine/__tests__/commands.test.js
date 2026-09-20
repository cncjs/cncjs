import controller from '../controller';
import { emergencyStop } from '../commands';

jest.mock('../controller', () => ({ command: jest.fn() }));

describe('emergencyStop', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    controller.command.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('holds first, and holds immediately', () => {
    emergencyStop();

    // Not after a tick, not after a promise: the first thing that happens when
    // the button is pressed is the machine being told to stop moving.
    expect(controller.command).toHaveBeenCalledTimes(1);
    expect(controller.command).toHaveBeenCalledWith('feedhold');
  });

  test('resets after the hold, not with it', () => {
    emergencyStop();
    expect(controller.command).toHaveBeenCalledTimes(1);

    // The gap is the point. A reset sent in the same breath as the hold
    // abandons the motion planner while the axes are still decelerating,
    // which is the same as never having held at all.
    jest.advanceTimersByTime(499);
    expect(controller.command).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1);
    expect(controller.command).toHaveBeenCalledTimes(2);
    expect(controller.command).toHaveBeenLastCalledWith('reset');
  });

  test('two presses stop twice rather than cancelling each other', () => {
    // An operator who hits it again because nothing looked like it happened
    // must not end up with a hold and no reset.
    emergencyStop();
    emergencyStop();
    jest.runAllTimers();

    expect(controller.command.mock.calls.map(([name]) => name))
      .toEqual(['feedhold', 'feedhold', 'reset', 'reset']);
  });
});
