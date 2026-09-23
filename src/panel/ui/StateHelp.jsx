import { useState } from 'react';
import Sheet from './Sheet';
import SegmentedChoice from './SegmentedChoice';
import { ALARM_STATE, CONTROLLERS, statesOf } from '../machine/readings';
import { t } from '../i18n';

/**
 * What every word the chip can show means, and which of them swallow a
 * command.
 *
 * This used to be two amber paragraphs wedged into the screens themselves —
 * one on the connection screen explaining that opening a port leaves Grbl in
 * alarm, one on the zeroing screen explaining why its buttons had gone dead.
 * Mateusz rejected both on 2026-09-23: *"to tutaj nie pasuje"*, and *"możemy
 * dodać gdzieś (?) pomoc i tam opisać zachowanie dla różnych sterowników"*.
 *
 * He is right about the shape. A paragraph that only appears in one state is
 * a screen that changes height when the machine does, and it explains the
 * same thing twice in two places. A sheet is asked for, read once, and gone.
 *
 * **Two tabs, because the words come from two places.** It described the
 * machine's states only — and only two of those: *"pomoc przy stausie nie
 * powinna opisywac tylko machine state ale wszystkie stany ktore wspieramy"*,
 * then *"jesli door i alarm to nie sa jedyne firmarwe statusy to dodaj
 * pozostale, moze wyswietlmy tylko te z wybranego polaczonego sterownika? i
 * rodzielmy [...] na dwa taby"* (2026-09-23).
 *
 * **A firmware is chosen, not inferred.** Grbl says nine words, TinyG
 * fourteen, and they are not the same fourteen — so one list of twenty-three
 * would make the reader work out which half is about their machine. The first
 * answer was to show only whatever is connected, which reads well right up
 * until somebody opens the help to find out what a controller *would* say
 * before buying or wiring one: *"zeby nie bazowac na aktualnie wybranym
 * sterowniku, zrobmy wewnatrz zakladki zakladki dla kazdego sterownika"*
 * (2026-09-23). So all four are there and the connected one is merely where
 * it opens.
 *
 * The one fact worth carrying across all of it: **in alarm the server sends
 * nothing at all.** Not the firmware refusing — the server, before the cable.
 *
 * Three of the four, to be exact, and the exception was found by writing this
 * sheet: `MarlinRunner.isAlarm()` is `return false // Not supported`, so the
 * gate in `MarlinController` is real code that can never fire. An earlier
 * note in this project said all four held the line back; they all *have* the
 * check, which is not the same thing.
 *
 * Two more that look as though they should behave the same way and do not:
 * TinyG's `Shutdown` and `Panic` pass straight through the server, and it is
 * the board that drops them.
 */

/*
 * What happens to a line written in this state, in three answers rather than
 * two.
 *
 * It was a green/red pair, and green said "commands get through" beside `Brak
 * odczytu` -- which Mateusz read and asked the right question: *"czemu przy
 * braku odczytu mamy komendy dochodza? dochodza gdzie"* (2026-09-23).
 *
 * They reach the cable. The port is open, the socket is attached, and the
 * server does write the line out. What nobody can say is whether anything at
 * the other end took it, because nothing at the other end has said a word --
 * that is the whole meaning of the state. Green claimed an answer that had
 * not arrived, and on a panel next to a spindle a green badge is read as
 * permission.
 *
 * So: green for sent and answered, amber for sent into silence, red for not
 * sent at all.
 */
const SENT = { yes: 'yes', blind: 'blind', no: 'no' };

const SEND = {
  [SENT.yes]: { key: 'stateHelp.sends', className: 'text-grn' },
  [SENT.blind]: { key: 'stateHelp.blind', className: 'text-amb' },
  [SENT.no]: { key: 'stateHelp.drops', className: 'text-red' },
};

/** A state, what it means, and what becomes of a command written in it. */
const Row = ({ state, means, send }) => (
  <div className="flex flex-col gap-1 border-b border-line py-3 last:border-b-0">
    <div className="flex items-baseline justify-between gap-3">
      {/* The firmware's own word is shown as the firmware says it, and the
        * panel's own words come through a key — see rule 8. Both arrive here
        * as text, so this component does not need to know which is which. */}
      <span className="font-num text-lead font-semibold text-ink">{state}</span>
      <span className={`shrink-0 text-cap font-semibold uppercase tracking-[0.06em] ${SEND[send].className}`}>
        {t(SEND[send].key)}
      </span>
    </div>
    <span className="text-note text-mut">{means}</span>
  </div>
);

/*
 * The panel's own five, in the order they are climbed.
 *
 * Server, then port, then a reading — each only knowable once the one before
 * it is true, which is also the order to read them in when something is
 * wrong. Only the last can carry a command: `Controller.command()` begins
 * `if (!this.port) return`, so everything above `noReading` is a panel
 * writing into nothing.
 *
 * Both keys written out rather than assembled from the name. Building them
 * would be shorter and would be a key nothing can grep for — the resources
 * test looks for quoted dotted literals, so every one of these would read as
 * a key nobody asks for and a misspelling would reach an operator.
 */
const OURS = [
  { word: 'status.noServer', means: 'stateHelp.noServer', send: SENT.no },
  { word: 'status.connecting', means: 'stateHelp.connecting', send: SENT.no },
  { word: 'status.noPort', means: 'stateHelp.noPort', send: SENT.no },
  { word: 'status.attaching', means: 'stateHelp.attaching', send: SENT.no },
  { word: 'status.noReading', means: 'stateHelp.noReading', send: SENT.blind },
];

/*
 * A sentence per firmware word, keyed by the word itself.
 *
 * Written out for the same reason as above. Several are shared because the
 * two vocabularies genuinely overlap — `Run` is `Run` on either board.
 */
const MEANS = {
  Idle: 'stateHelp.idle',
  Ready: 'stateHelp.idle',
  Run: 'stateHelp.run',
  Cycle: 'stateHelp.run',
  Jog: 'stateHelp.jog',
  Home: 'stateHelp.home',
  Hold: 'stateHelp.hold',
  Alarm: 'stateHelp.alarm',
  Door: 'stateHelp.door',
  Check: 'stateHelp.check',
  Sleep: 'stateHelp.sleep',
  Initializing: 'stateHelp.initializing',
  Stop: 'stateHelp.stop',
  End: 'stateHelp.end',
  Probe: 'stateHelp.probe',
  Interlock: 'stateHelp.interlock',
  Shutdown: 'stateHelp.shutdown',
  Panic: 'stateHelp.panic',
};

/*
 * Where a word means the same thing but the way out of it does not.
 *
 * `Alarm` is the one so far: on Grbl and Smoothie it is usually how the board
 * comes up, because opening the port resets it and `$22=1` starts in alarm --
 * which is the single most confusing thing about a fresh connection, and
 * completely untrue of TinyG. A reader on TinyG was being told about `$22`.
 */
const MEANS_BY_FIRMWARE = {
  Grbl: { Alarm: 'stateHelp.alarmGrbl' },
  Smoothie: { Alarm: 'stateHelp.alarmGrbl' },
};

const TABS = ['ours', 'firmware'];

const StateHelp = ({ machine, onClose }) => {
  const [tab, setTab] = useState('ours');

  /*
   * Opens on whatever is connected, and goes wherever it is taken after that.
   *
   * `useState`'s initial value only, not a prop it follows: a list that
   * jumped back to Grbl because a port happened to open while somebody was
   * reading about TinyG would be the panel arguing with a finger.
   */
  const [firmware, setFirmware] = useState(
    () => (CONTROLLERS.includes(machine?.type) ? machine.type : CONTROLLERS[0])
  );

  const states = statesOf(firmware);

  return (
    <Sheet title={t('stateHelp.title')} onClose={onClose}>
      <SegmentedChoice
        label={t('stateHelp.title')}
        options={TABS}
        value={tab}
        onChange={setTab}
        format={(id) => t(id === 'ours' ? 'stateHelp.ours' : 'stateHelp.firmware')}
      />

      {tab === 'ours' ? (
        <div className="flex flex-col">
          {OURS.map(({ word, means, send }) => (
            <Row key={word} state={t(word)} send={send} means={t(means)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {/* Four names, four cells. `SegmentedChoice` divides one row
            * between its options, which is right for four and was wrong for
            * six baud rates — see the grid on the connection screen. */}
          <SegmentedChoice
            label={t('stateHelp.firmware')}
            options={CONTROLLERS}
            value={firmware}
            onChange={setFirmware}
          />
          {states.map(({ word }) => (
            <Row
              key={word}
              state={word}
              // Alarm alone, and it is the server rather than the firmware
              // that stops it. See `readings.canSendGcode`. Every other state
              // here is one the machine is reporting, so a line sent in it is
              // a line something is known to be listening for.
              send={word === ALARM_STATE ? SENT.no : SENT.yes}
              means={t(MEANS_BY_FIRMWARE[firmware]?.[word] || MEANS[word] || 'stateHelp.unknown')}
            />
          ))}
          {/*
            * Marlin, which is the one of the four that reports no machine
            * state at all. An empty list under its name would read as a bug
            * in the help rather than a fact about the firmware.
            */}
          {states.length ? null : (
            <p className="m-0 py-3 text-note text-mut">{t('stateHelp.noStates')}</p>
          )}
        </div>
      )}

      <p className="m-0 text-note text-mut">{t('stateHelp.note')}</p>
    </Sheet>
  );
};

export default StateHelp;
