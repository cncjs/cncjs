import { useMemo, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import PortRow from '../ui/PortRow';
import SegmentedChoice from '../ui/SegmentedChoice';
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
 * browser — `scripts/connect-machine.js`, written for exactly that reason —
 * and a panel that cannot connect to its own machine is not a panel.
 *
 * One layout, not two. Every other screen has a phone shape because the two
 * genuinely differ; a list of ports and two choices is the same column at
 * 390px and at 1920px, and a second layout would be the same code with
 * different gaps in it.
 */

/** The state the machine comes up in after a port opens. See the note below. */
const ALARM = 'Alarm';

/**
 * The caption over a row of chips, in the jog card's own form.
 *
 * Not decoration. `SegmentedChoice` carries its name in `aria-label` only,
 * which is the right place for the name a screen reader says and the wrong
 * place for the one an operator needs: six bare numbers in a row read as a
 * scale of something, and the panel has a feed rate in `mm/min` that is also
 * a four-to-six digit number on a row of chips.
 */
const Label = ({ children, unit }) => (
  <span className="text-label font-semibold uppercase leading-none text-ink">
    {children} <span className="normal-case text-mut">{unit}</span>
  </span>
);

const ConnectScreen = ({ machine }) => {
  const { list, controllers, baudrates, asked, refresh } = usePorts(machine.linked);
  const [picked, setPicked] = useState('');
  const [controllerType, setControllerType] = useState(DEFAULT_CONTROLLER);
  const [baudrate, setBaudrate] = useState(DEFAULT_BAUDRATE);
  const [busy, setBusy] = useState(false);
  // A key, not a sentence, and not the server's own words: its `Error` does
  // not survive socket.io's encoding. See `ports.js`.
  const [failure, setFailure] = useState(null);

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
  const open = rows.some((row) => row.port === selected && row.state === PORT_OPEN);

  const act = (run) => {
    setBusy(true);
    setFailure(null);
    run()
      .catch(() => setFailure(open ? 'connect.closeFailed' : 'connect.openFailed'))
      .finally(() => setBusy(false));
  };

  return (
    <Card label={t('connect.title')} className="min-h-0 flex-1" bodyClassName="gap-4">
      {/* The list scrolls and nothing else does. A screen whose buttons leave
        * the bottom of the frame when a computer happens to have nine serial
        * ports is a screen that cannot be used on the machine it found them
        * on. */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {rows.map((row) => (
          <PortRow
            key={row.port}
            {...row}
            chosen={row.port === selected}
            onChoose={setPicked}
          />
        ))}

        {/* Three different silences, and only one of them is "none". A server
          * that has not answered has told us nothing, and reporting that as an
          * empty list blames the wrong computer. */}
        {rows.length ? null : (
          <p className="m-0 px-1 py-3 text-base text-mut">
            {t(machine.linked ? (asked ? 'connect.noPorts' : 'connect.asking') : 'connect.noServer')}
          </p>
        )}
      </div>

      {/*
        * The two settings, and only while they mean anything.
        *
        * Attaching to a port the server already has open ignores both — the
        * controller exists, and `open` only joins this socket to its room —
        * so offering them there would be two controls that change nothing and
        * say nothing about it.
        */}
      {open ? null : (
        <div className="flex shrink-0 flex-col gap-2.5">
          <Label>{t('connect.controller')}</Label>
          <SegmentedChoice
            label={t('connect.controller')}
            options={controllerChoices(controllers)}
            value={controllerType}
            onChange={setControllerType}
          />
          <Label unit={t('units.baud')}>{t('connect.baudrate')}</Label>
          <SegmentedChoice
            label={t('connect.baudrate')}
            unit={t('units.baud')}
            options={baudrateChoices(baudrates)}
            value={baudrate}
            onChange={setBaudrate}
          />
        </div>
      )}

      {/*
        * What the machine does the moment a port opens, said before it is
        * done rather than after.
        *
        * Grbl resets when the port opens and comes up in `Alarm` whenever
        * `$22=1`, because it has no idea where it is until it has homed. That
        * is not a fault and it is not this panel's to clear: `$X` gives an
        * unreferenced machine permission to move, and what is on the other
        * end of the cable is the operator's business, not a screen's.
        */}
      {machine.connected && machine.status.word === ALARM ? (
        <p className="m-0 shrink-0 rounded-ctl border border-amb bg-ambS px-4 py-3 text-base text-amb">
          {t('connect.alarm')}
        </p>
      ) : null}

      {failure ? (
        <p className="m-0 shrink-0 rounded-ctl border border-red bg-redS px-4 py-3 text-base text-red">
          {t(failure)}
        </p>
      ) : null}

      <div className="flex shrink-0 gap-2">
        <Button onClick={refresh} disabled={!machine.linked || busy} className="h-ctl">
          {t('connect.refresh')}
        </Button>
        <Button
          tone={open ? 'stop' : 'primary'}
          disabled={!selected || busy}
          onClick={() => act(() => (open
            ? machine.disconnect(selected)
            : machine.connect(selected, { controllerType, baudrate })))}
          className="h-ctl flex-1"
        >
          {t(open ? 'connect.disconnect' : 'connect.connect')}
        </Button>
      </div>
    </Card>
  );
};

export default ConnectScreen;
