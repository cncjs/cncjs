import { readMachine, formatPosition, NO_READING } from '../readings';

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
    expect(readMachine({ connection: 'connecting' }).status.word).toBe('Connecting');
    expect(readMachine({ connection: 'failed', error: 'x' }).status.word).toBe('No server');
    expect(readMachine({ connection: 'open', port: '' }).status.word).toBe('Disconnected');
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
    expect(read.status.word).toBe('Connecting');
    expect(read.connected).toBe(false);
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
    expect(read.status).toEqual({ word, tone, known: true });
  });

  test('a state nobody planned for gets no colour rather than the last one', () => {
    expect(readMachine(grbl('Reconfiguring', {})).status.tone).toBe('inactive');
  });

  test('an open port that has not reported yet is connected, not idle', () => {
    // Between opening a port and the first status report there is genuinely
    // nothing to say, and "Idle" there would be a claim the controller has
    // not made.
    const read = readMachine({ connection: 'open', port: 'COM3', type: 'Grbl', attached: true, state: {} });
    expect(read.status).toEqual({ word: 'Connected', tone: 'inactive', known: false });
  });

  test('Smoothie is read with Grbl\'s vocabulary, because it is the same one', () => {
    const read = readMachine({ ...grbl('Run', {}), type: 'Smoothie' });
    expect(read.status.word).toBe('Run');
  });

  test('TinyG is translated out of its numbering', () => {
    const tinyg = (machineState) => readMachine({
      connection: 'open', port: 'COM3', type: 'TinyG', attached: true, state: { sr: { machineState } },
    });
    expect(tinyg(5).status).toEqual({ word: 'Run', tone: 'running', known: true });
    expect(tinyg(2).status).toEqual({ word: 'Alarm', tone: 'stopped', known: true });
    // The trap: state 0 is a state, and it is falsy. A lookup guarded with
    // `||` would report it as unknown.
    expect(tinyg(0).status).toEqual({ word: 'Initializing', tone: 'inactive', known: true });
  });

  test('a firmware with no machine state says only what it knows', () => {
    // Marlin has none. Inventing one would be worse than admitting it.
    const read = readMachine({ connection: 'open', port: 'COM3', type: 'Marlin', attached: true, state: {} });
    expect(read.status).toEqual({ word: 'Connected', tone: 'inactive', known: false });
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
