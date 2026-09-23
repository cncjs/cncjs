import { useMemo, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import FadeScroller from '../ui/FadeScroller';
import PortRow from '../ui/PortRow';
import SegmentedChoice from '../ui/SegmentedChoice';
import Sheet from '../ui/Sheet';
import SettingSummary from '../ui/SettingSummary';
import { NO_READING } from '../machine/readings';
import { usePorts } from '../machine/usePorts';
import {
  readPorts,
  baudrateChoices,
  controllerChoices,
  DEFAULT_BAUDRATE,
  DEFAULT_CONTROLLER,
  PORT_OPEN,
} from '../machine/ports';
import { t } from '../i18n';

/**
 * Which machine the panel is talking to.
 *
 * This is what stops the panel needing the old application. Until it existed,
 * a port was opened by driving `/workspace`'s connection widget in a headless
 * browser by a script written for exactly that reason, and a panel that
 * cannot connect to its own machine is not a panel. That script went out
 * with this screen.
 *
 * **Three lines that say what is chosen, and a sheet behind each.** The jog
 * card's own answer to the same problem, asked for by name — *"zastosuj
 * rozwizanie z jog"*, then *"opcje moga byc osobno, sterownik i baud"* and
 * *"na telefonie to tez moze byc przycisk i sheet"* for the port list beside
 * them.
 *
 * At every width, not only on a phone. It had a second layout for a day, with
 * the list and the chips laid out in place above a certain size — and that
 * size is a tablet on a workbench rather than a desk: *"zakladamy ze ten
 * rozmiar to tablet, wiec raczej dotykowy i mozemy zrobic przyciski i
 * sheet"*. A finger is a finger at 390px and at 1280, so there is one shape
 * again and it is the one built for a finger.
 */

const ConnectScreen = ({ machine }) => {
  const { list, controllers, baudrates, asked, refresh } = usePorts(machine.linked);
  const [picked, setPicked] = useState('');
  const [controllerType, setControllerType] = useState(DEFAULT_CONTROLLER);
  const [baudrate, setBaudrate] = useState(DEFAULT_BAUDRATE);
  const [busy, setBusy] = useState(false);
  // Which sheet is open: `port`, `controller`, `baudrate` or none.
  const [editing, setEditing] = useState(null);
  // `{ key, vars }`, not a sentence: the server's own words are English prose
  // and its `Error` does not survive socket.io's encoding either way. See
  // `ports.js`.
  const [failure, setFailure] = useState(null);

  /*
   * What the panel is talking to, said whether or not it is talking to
   * anything.
   *
   * Asked for on 2026-09-23 — *"domyslnie wyswietlaj steronik i port oraz
   * adres serwera, tylko puste jak nie ma"*. The top bar carries two of these
   * while connected and drops them on a phone; this is the screen where they
   * are the subject, and a row that disappears when the answer is "none" is a
   * row nobody can use to tell "not connected" from "not shown".
   *
   * The server's address is the origin the panel was served from — the panel
   * has no other. It is the one of the three known even when everything else
   * is dark, which is exactly when somebody is looking for it: a pendant that
   * cannot reach its machine is usually pointed at the wrong host.
   */
  const identity = [
    { key: 'topbar.controller', value: machine.type },
    { key: 'topbar.port', value: machine.port },
    { key: 'connect.server', value: window.location.host },
  ];

  const held = machine.connected ? machine.port : '';
  const rows = useMemo(() => readPorts(list, held), [list, held]);

  /*
   * Which row is selected, without a piece of state that can go stale.
   *
   * A port can be unplugged while the screen is open, and a `picked` that is
   * no longer in the list would leave the button pointing at hardware that is
   * not there. Deriving it means the selection falls back on its own: to the
   * port this panel holds, or failing that to the first one offered.
   */
  const selected = [picked, held, rows.length ? rows[0].port : '']
    .find((port) => rows.some((row) => row.port === port)) || '';

  /*
   * Whether this panel is holding a port -- asked of the machine rather than
   * of the selection.
   *
   * It used to be "is the *selected* row the open one", which made the screen
   * offer Connect the moment somebody scrolled to a different port, and
   * `connect` opens without closing anything. Both ports then ran at once:
   * COM3 at 13:00:33 and COM1 three seconds later, in this fork's own server
   * log. *"port moge miec polaczony jeden w danej chwili"* (2026-09-23).
   *
   * Worse than an untidy list. `/api/controllers` answers with every open
   * port and the panel attaches to the first, so a reload could land on the
   * empty one and look exactly like the connection having been dropped --
   * which is how this was noticed.
   */
  const open = Boolean(held) && rows.some((row) => row.state === PORT_OPEN);

  /*
   * The refusal the server can give that is worth repeating.
   *
   * A port already open with other settings is not a failure of this panel --
   * it is another client having got there first, which on a machine with a
   * pendant, a laptop and a terminal open is ordinary. "Could not open the
   * port" would send somebody to look at a cable.
   */
  const CLASH = {
    controllerType: 'connect.clashController',
    baudrate: 'connect.clashBaudrate',
  };

  const act = (run) => {
    setBusy(true);
    setFailure(null);
    run()
      .catch((reason) => setFailure(
        reason?.code === 'port-settings-clash' && CLASH[reason.setting]
          ? { key: CLASH[reason.setting], vars: reason }
          : { key: open ? 'connect.closeFailed' : 'connect.openFailed' }
      ))
      .finally(() => setBusy(false));
  };

  /** Three different silences, and only one of them is "none". */
  const empty = t(machine.linked
    ? (asked ? 'connect.noPorts' : 'connect.asking')
    : 'connect.noServer');

  const ports = (
    <FadeScroller className="flex flex-col gap-2">
      {rows.map((row) => (
        <PortRow
          key={row.port}
          {...row}
          chosen={row.port === selected}
          // Picking one is the whole of what the sheet is for, so it closes
          // on the choice rather than asking for a second tap to confirm it.
          onChoose={(port) => { setPicked(port); setEditing(null); }}
        />
      ))}
      {rows.length ? null : <p className="m-0 px-1 py-3 text-base text-mut">{empty}</p>}
    </FadeScroller>
  );

  const controllerChips = (
    <SegmentedChoice
      label={t('connect.controller')}
      options={controllerChoices(controllers)}
      value={controllerType}
      onChange={setControllerType}
    />
  );

  /*
   * Three at a time, wrapped, where there is not room for six.
   *
   * `SegmentedChoice` divides one row between its options, which is right for
   * four steps and wrong for six baud rates on a phone: `250000` needs 48px
   * and gets 39. A grid is the same control with the row broken.
   */
  const baudGrid = (
    <div className="grid grid-cols-3 gap-2">
      {baudrateChoices(baudrates).map((rate) => (
        <Button
          key={rate}
          compact
          tone={rate === baudrate ? 'primary' : 'outline'}
          aria-pressed={rate === baudrate}
          onClick={() => setBaudrate(rate)}
          className="h-chiph font-num"
        >
          {rate}
        </Button>
      ))}
    </div>
  );

  const SHEETS = {
    port: { title: t('connect.choosePort'), body: ports },
    controller: { title: t('connect.controller'), body: controllerChips },
    baudrate: { title: t('connect.baudrate'), body: baudGrid },
  };
  const sheet = SHEETS[editing];

  return (
    <Card
      label={t('connect.title')}
      className="flex-1"
      bodyClassName="gap-4"
    >
      <dl className="m-0 flex shrink-0 flex-col gap-1">
        {identity.map(({ key, value }) => (
          <div key={key} className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-cap uppercase tracking-[0.08em] text-mut">{t(key)}</dt>
            <dd className="m-0 min-w-0 truncate font-num text-base text-ink">
              {value || NO_READING}
            </dd>
          </div>
        ))}
      </dl>

      {/*
        * The three choices, always all three.
        *
        * The controller and the rate used to disappear once the port was
        * open, on the reasoning that attaching to a running port ignores
        * both. True, and beside the point: *"po polaczeniu chce miec widoczne
        * wszystkie opcje"* (2026-09-23). What a connected panel is talking
        * to, and at what rate, is exactly what somebody wants to read after
        * connecting -- and a row that vanishes takes the answer with it.
        *
        * So they stay and go quiet instead, showing what the open port is
        * actually running at rather than the last thing picked from a list.
        *
        * The port locks with them, because one port at a time is the rule --
        * see the button below.
        */}
      <div className="flex shrink-0 flex-col gap-2.5">
        <SettingSummary
          title={t('connect.choosePort')}
          values={[{ value: (held || selected) || NO_READING }]}
          disabled={open}
          onOpen={() => setEditing('port')}
        />
        <SettingSummary
          title={t('connect.controller')}
          values={[{ value: (open ? machine.type : controllerType) || NO_READING }]}
          disabled={open}
          onOpen={() => setEditing('controller')}
        />
        <SettingSummary
          title={t('connect.baudrate')}
          values={[{
            value: (open ? machine.baudrate : baudrate) || NO_READING,
            unit: t('units.baud'),
          }]}
          disabled={open}
          onOpen={() => setEditing('baudrate')}
        />
      </div>

      {/* Nothing between the choices and the buttons, so the card is as tall
        * as it needs to be and the actions sit under the thumb rather than
        * wherever a list of ports happens to end. */}
      <span className="min-h-0 flex-1" />

      {failure ? (
        <p className="m-0 shrink-0 rounded-ctl border border-red bg-redS px-4 py-3 text-base text-red">
          {t(failure.key, failure.vars)}
        </p>
      ) : null}

      <div className="flex shrink-0 gap-2">
        <Button onClick={refresh} disabled={!machine.linked || busy} className="h-ctl">
          {t('connect.refresh')}
        </Button>
        <Button
          tone={open ? 'stop' : 'primary'}
          disabled={(open ? !held : !selected) || busy}
          onClick={() => act(() => (open
            ? machine.disconnect(held)
            : machine.connect(selected, { controllerType, baudrate })))}
          className="h-ctl flex-1"
        >
          {t(open ? 'connect.disconnect' : 'connect.connect')}
        </Button>
      </div>

      {/*
        * What opening a port does to the machine, behind the `?` rather than
        * on the screen.
        *
        * Grbl resets when the port opens and comes up in alarm whenever
        * `$22=1`. That used to be an amber paragraph here; Mateusz was not
        * sure it belonged, and it reads better as something asked for than as
        * something that appears when the machine changes state.
        *
        * What has not changed: the panel does not clear the alarm. `$X` gives
        * an unreferenced machine permission to move, and what is on the other
        * end of the cable is the operator's business.
        */}

      {sheet ? (
        <Sheet title={sheet.title} onClose={() => setEditing(null)}>
          {sheet.body}
        </Sheet>
      ) : null}
    </Card>
  );
};

export default ConnectScreen;
