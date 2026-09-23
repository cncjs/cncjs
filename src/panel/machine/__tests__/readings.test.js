import { readMachine, statesOf, formatPosition, NO_READING } from '../readings';

const grbl = (activeState, wpos) => ({
  connection: 'open',
  error: null,
  port: 'COM3',
  type: 'Grbl',
  attached: true,
  state: { status: { activeState, wpos } },
});

describe('readMachine, before there is a machine', () => {
  test('says which kind of nothing it is', () => {
    // Three different absences, and an operator acts differently on each:
    // the server is unreachable, the page is still starting, or there is
    // simply no port open. One word for all three would be a shrug.
    // Named, not worded: these three are the panel's own states and the word
    // for each belongs to whichever language is being read.
    expect(readMachine({ connection: 'connecting' }).status.key).toBe('status.connecting');
    expect(readMachine({ connection: 'failed', error: 'x' }).status.key).toBe('status.noServer');
    expect(readMachine({ connection: 'open', port: '' }).status.key).toBe('status.noPort');
  });

  test('a failed server is coloured like a stopped machine', () => {
    // Because that is what it is, from where the operator is standing.
    expect(readMachine({ connection: 'failed' }).status.tone).toBe('stopped');
  });

  test('a port that is open but not yet attached is still connecting', () => {
    // The gap that made a jog key look pressable and do nothing:
    // `Controller.command()` begins `if (!this.port) return` and fails in
    // silence, so knowing which port is open is not the same as being able to
    // send to it. Until the socket has attached, the panel says so and its
    // controls stay disabled.
    const read = readMachine({
      connection: 'open', port: 'COM3', type: 'Grbl', attached: false,
      state: { status: { activeState: 'Idle' } },
    });
    expect(read.status.key).toBe('status.attaching');
    expect(read.connected).toBe(false);
  });

  test('tells a reachable server with no machine from no server at all', () => {
    // The distinction only the connection screen cares about, and the one it
    // cannot work without: with a server there is a list of ports to offer
    // and something to press, and without one there is neither. Reporting the
    // second as "no ports found" blames the wrong computer.
    expect(readMachine({ connection: 'open', port: '' }).linked).toBe(true);
    expect(readMachine({ connection: 'failed' }).linked).toBe(false);
    expect(readMachine({ connection: 'connecting' }).linked).toBe(false);

    // And it is not merely `connected` under another name: a server answering
    // with nothing plugged in is the ordinary state of this screen.
    expect(readMachine({ connection: 'open', port: '' }).connected).toBe(false);
  });
});

describe('readMachine, on a machine that will not take a line', () => {
  const attached = (activeState) => readMachine({
    connection: 'open', port: 'COM3', type: 'Grbl', attached: true,
    state: { status: { activeState } },
  });

  test('says a line would not arrive while the machine is in alarm', () => {
    // Every controller the server drives resets its feeder and drops the line
    // rather than sending it. Measured: `G10 L20 P1 Z0` went onto the socket,
    // the server logged that it had stopped, and no offset changed.
    expect(attached('Alarm').canSendGcode).toBe(false);
    expect(attached('Alarm').connected).toBe(true);
  });

  test('and that it would in every state the server does not gate', () => {
    // Door is the one that looks like alarm and is not: a hold for an open
    // guard resumes, and the server sends through it.
    for (const state of ['Idle', 'Run', 'Hold', 'Door', 'Jog', 'Check', 'Home', 'Sleep']) {
      expect([state, attached(state).canSendGcode]).toEqual([state, true]);
    }
  });

  test('and that nothing arrives with no machine at all', () => {
    expect(readMachine({ connection: 'open', port: '' }).canSendGcode).toBe(false);
  });
});

describe('readMachine, with a controller answering', () => {
  test.each([
    ['Run', 'running'],
    ['Jog', 'running'],
    ['Home', 'running'],
    ['Idle', 'ready'],
    ['Hold', 'ready'],
    ['Alarm', 'stopped'],
    ['Door', 'stopped'],
    ['Check', 'inactive'],
    ['Sleep', 'inactive'],
  ])('shows %s as %s', (word, tone) => {
    const read = readMachine(grbl(word, {}));
    // No key: this word is the firmware's own and is shown as it says it.
    expect(read.status).toEqual({ word, key: null, tone, known: true });
  });

  test('a state nobody planned for gets no colour rather than the last one', () => {
    expect(readMachine(grbl('Reconfiguring', {})).status.tone).toBe('inactive');
  });

  test('an open port that has not reported yet is connected, not idle', () => {
    // Between opening a port and the first status report there is genuinely
    // nothing to say, and "Idle" there would be a claim the controller has
    // not made.
    const read = readMachine({ connection: 'open', port: 'COM3', type: 'Grbl', attached: true, state: {} });
    expect(read.status).toEqual({
      word: null, key: 'status.noReading', tone: 'inactive', known: false,
    });
  });

  test('Smoothie is read with Grbl\'s vocabulary, because it is the same one', () => {
    const read = readMachine({ ...grbl('Run', {}), type: 'Smoothie' });
    expect(read.status.word).toBe('Run');
  });

  test('TinyG is translated out of its numbering', () => {
    const tinyg = (machineState) => readMachine({
      connection: 'open', port: 'COM3', type: 'TinyG', attached: true, state: { sr: { machineState } },
    });
    expect(tinyg(5).status).toEqual({ word: 'Run', key: null, tone: 'running', known: true });
    expect(tinyg(2).status).toEqual({ word: 'Alarm', key: null, tone: 'stopped', known: true });
    // The trap: state 0 is a state, and it is falsy. A lookup guarded with
    // `||` would report it as unknown.
    expect(tinyg(0).status).toEqual({
      word: 'Initializing', key: null, tone: 'inactive', known: true,
    });
  });

  test('a firmware with no machine state says only what it knows', () => {
    // Marlin has none. Inventing one would be worse than admitting it.
    const read = readMachine({ connection: 'open', port: 'COM3', type: 'Marlin', attached: true, state: {} });
    expect(read.status).toEqual({
      word: null, key: 'status.noReading', tone: 'inactive', known: false,
    });
  });

  test('reads the work position, and nothing where there is none', () => {
    const read = readMachine(grbl('Idle', { x: '12.5', y: '0.000' }));
    expect(read.position).toEqual({ x: 12.5, y: 0, z: null });
  });
});

describe('formatPosition', () => {
  test('keeps three decimals so the digits do not move', () => {
    expect(formatPosition(12.5)).toBe('12.500');
    expect(formatPosition(0)).toBe('0.000');
    expect(formatPosition(-3)).toBe('-3.000');
  });

  test('a dash where there is no reading, and never a zero', () => {
    // On an unhomed machine "0.000" and "we have not been told" are very
    // different statements, and only one of them is safe to act on.
    expect(formatPosition(null)).toBe(NO_READING);
    expect(formatPosition(NaN)).toBe(NO_READING);
  });
});

describe('the rate the port is running at', () => {
  const open = {
    connection: 'open', attached: true, port: 'COM3', type: 'Grbl', state: {},
  };

  it('is carried through while a port is open', () => {
    expect(readMachine({ ...open, baudrate: 115200 }).baudrate).toBe(115200);
  });

  it('is null when nothing is open, whatever was left over', () => {
    // The field survives in the snapshot across a close, and a rate shown
    // beside a dead port is a rate somebody will read as a live one.
    expect(readMachine({ ...open, port: '', baudrate: 115200 }).baudrate).toBeNull();
  });

  it('is null rather than undefined when the server did not say', () => {
    expect(readMachine(open).baudrate).toBeNull();
  });
});

describe('the chip names which layer is missing', () => {
  // Three things stand between an operator and a machine, and the chip used
  // to answer for all three in words that overlapped. Each of these was
  // ambiguous before: `connecting` meant two different failures, and
  // `connected` was not about a connection.
  it('says no server when the link is down', () => {
    expect(readMachine({ connection: 'failed' }).status.key).toBe('status.noServer');
  });

  it('says no port when the server is fine and nothing is open', () => {
    expect(readMachine({ connection: 'open', port: '' }).status.key).toBe('status.noPort');
  });

  it('tells attaching apart from connecting', () => {
    expect(readMachine({ connection: 'connecting' }).status.key).toBe('status.connecting');
    expect(readMachine({ connection: 'open', port: 'COM3', attached: false }).status.key)
      .toBe('status.attaching');
  });

  it('says no reading while the machine has not reported', () => {
    expect(readMachine({ connection: 'open', port: 'COM3', attached: true, state: {} }).status.key)
      .toBe('status.noReading');
  });

  it('shows the firmware word once there is one, and no key of its own', () => {
    const read = readMachine({
      connection: 'open', port: 'COM3', attached: true, type: 'Grbl',
      state: { status: { activeState: 'Alarm' } },
    });
    expect(read.status.key).toBeNull();
    expect(read.status.word).toBe('Alarm');
  });
});

describe('statesOf', () => {
  it('lists what Grbl and Smoothie can say', () => {
    const words = statesOf('Grbl').map((s) => s.word);
    expect(words).toContain('Idle');
    expect(words).toContain('Alarm');
    expect(words).toContain('Door');
    expect(statesOf('Smoothie')).toEqual(statesOf('Grbl'));
  });

  it('lists the words TinyG sends as numbers', () => {
    const words = statesOf('TinyG').map((s) => s.word);
    expect(words).toContain('Panic');
    expect(words).toContain('Interlock');
  });

  // Not an oversight: Marlin reports no machine state, so a panel on one
  // never leaves `noReading`. The help sheet says so rather than showing an
  // empty list.
  it('is empty for Marlin and for nothing connected', () => {
    expect(statesOf('Marlin')).toEqual([]);
    expect(statesOf('')).toEqual([]);
  });

  it('agrees with the chip about every word it lists', () => {
    statesOf('Grbl').forEach(({ word, tone }) => {
      const read = readMachine({
        connection: 'open', port: 'COM3', attached: true, type: 'Grbl',
        state: { status: { activeState: word } },
      });
      expect(read.status.word).toBe(word);
      expect(read.status.tone).toBe(tone);
    });
  });
});
