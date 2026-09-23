import { adviceFor } from '../advice';
import { readMachine } from '../readings';

/** The shape the panel actually hands it, rather than a hand-built object. */
const read = (snapshot) => readMachine({ settings: {}, ...snapshot });

describe('adviceFor', () => {
  test('says nothing at all when there is nothing to do', () => {
    // The ordinary case, and it has to stay quiet: a sheet that always had
    // something to say would train anyone to stop reading it.
    const idle = read({
      connection: 'open', port: 'COM3', type: 'Grbl', attached: true,
      state: { status: { activeState: 'Idle' } },
    });
    expect(adviceFor(idle)).toBeNull();
  });

  test('points at the connection screen when the server is unreachable', () => {
    // It cannot start the server, but it is the one screen that shows which
    // host the panel is pointed at — usually the answer.
    expect(adviceFor(read({ connection: 'failed' })))
      .toEqual({ key: 'advice.noServer', go: true });
  });

  test('points at the connection screen when no port is open', () => {
    expect(adviceFor(read({ connection: 'open', port: '' })))
      .toEqual({ key: 'advice.noPort', go: true });
  });

  test('says to wait while a known port is still attaching', () => {
    /*
     * The gap between "a port is open" and "this socket can send to it". Real
     * time, not an error — and advice that sent somebody to the connection
     * screen here would have them reconnecting a machine that was in the act
     * of connecting.
     */
    const attaching = read({ connection: 'open', port: 'COM3', type: 'Grbl', attached: false });
    expect(adviceFor(attaching)).toEqual({ key: 'advice.attaching', go: false });
  });

  test('says to home or unlock when the server will not send', () => {
    const alarmed = read({
      connection: 'open', port: 'COM3', type: 'Grbl', attached: true,
      state: { status: { activeState: 'Alarm' } },
    });
    // Not `go`: the connection screen cannot clear an alarm, and neither does
    // the panel. See `readings.canSendGcode`.
    expect(adviceFor(alarmed)).toEqual({ key: 'advice.alarm', go: false });
  });

  test('a door hold is not an alarm, and needs no advice', () => {
    // The state that looks like alarm and is not: the server sends through
    // it, so there is nothing for anyone to do about it.
    const door = read({
      connection: 'open', port: 'COM3', type: 'Grbl', attached: true,
      state: { status: { activeState: 'Door' } },
    });
    expect(adviceFor(door)).toBeNull();
  });

  test('survives being asked about nothing', () => {
    // Called before the first reading on a page that has only just loaded.
    expect(adviceFor()).toEqual({ key: 'advice.noServer', go: true });
  });
});
