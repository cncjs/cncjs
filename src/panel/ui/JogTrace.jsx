import { useState } from 'react';
import controller from '../machine/controller';
import useJogTrace from './useJogTrace';
import {
  placeAt, pressBars, responseTimes, travelled, WINDOW_MS,
} from '../machine/jog-trace';

/**
 * What you pressed, what was sent, and what the machine did — on one clock.
 *
 * Three things that are each visible on their own and never together: the key
 * going down, the segment leaving for the machine, and the tool moving. The
 * gaps between them are the whole of every argument about jogging feeling
 * late, so they go on one timeline where the gap can be pointed at.
 *
 * Time runs left to right and the right-hand edge is now, so a recording
 * reads the way a person watches one. The rows are in the order an
 * instruction travels: key, wire, machine.
 *
 * **Drawn in SVG rather than positioned divs.** Everything here is a
 * coordinate — where in the last twelve seconds a thing happened — and a
 * coordinate is geometry, not styling. It also keeps the panel's rule that
 * components do not carry hand-written styles.
 */

const LABELS = {
  ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
  PageUp: 'Z+', PageDown: 'Z−',
};

/** Drawing units across the full window. */
const W = 100;
/** Drawing units down one row. */
const H = 20;

const Row = ({ label, children }) => (
  <div className="flex items-center gap-2">
    <span className="w-20 shrink-0 text-right text-cap uppercase text-mut">{label}</span>
    <div className="min-w-0 flex-1 overflow-hidden rounded-ctl border border-line bg-field">
      <svg className="block h-8 w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {children}
      </svg>
    </div>
  </div>
);

/**
 * One row per key, rather than one row with labels in it.
 *
 * The drawing is stretched to the width of the panel, which stretches any
 * text inside it into something unreadable. Putting the name outside the
 * drawing solves that and reads better anyway: two bars side by side in
 * different rows is a diagonal, at a glance.
 */
const Keys = ({ bars, now }) => bars.map((bar) => (
  <rect
    key={`${bar.key}-${bar.from}`}
    x={placeAt(bar.from, now) * W}
    y={4}
    width={Math.max(0.4, (placeAt(bar.to, now) * W) - (placeAt(bar.from, now) * W))}
    height={12}
    rx={1.5}
    className="fill-acc opacity-50"
  />
));

/**
 * Every segment as a hairline, every cancel as a thicker mark.
 *
 * Where a cancel falls relative to a key coming up is most of what there is
 * to understand about stopping.
 */
const Wire = ({ events, now }) => events
  .filter((event) => event.kind === 'segment' || event.kind === 'cancel')
  .map((event, i) => (
    <rect
      key={`${event.kind}-${event.t}-${i}`}
      x={placeAt(event.t, now) * W}
      y={event.kind === 'cancel' ? 0 : 4}
      width={event.kind === 'cancel' ? 0.6 : 0.18}
      height={event.kind === 'cancel' ? H : 12}
      className={event.kind === 'cancel' ? 'fill-amb' : 'fill-acc'}
    />
  ));

/**
 * The axes, scaled to whatever moved in this window.
 *
 * A 1mm nudge draws as readably as a 200mm traverse; the figure in the header
 * says which it was. Without that, most recordings are a flat line.
 */
const Move = ({ events, now }) => {
  const positions = events.filter((event) => event.kind === 'position');

  if (positions.length < 2) {
    return null;
  }

  const path = (pick) => {
    const values = positions.map(pick);
    const low = Math.min(...values);
    const span = Math.max(...values) - low;

    return positions
      .map((p, i) => {
        const x = placeAt(p.t, now) * W;
        const y = span > 0.001 ? 17 - (((values[i] - low) / span) * 14) : 10;
        return `${i ? 'L' : 'M'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  };

  return (
    <>
      <path d={path((p) => p.x)} className="fill-none stroke-acc" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d={path((p) => p.y)} className="fill-none stroke-grn" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </>
  );
};

const JogTrace = () => {
  const [open, setOpen] = useState(true);
  const [saved, setSaved] = useState(null);
  const { events, clear } = useJogTrace(open);

  /*
   * **Written on the server, not downloaded here.**
   *
   * A recording is no use to anybody while it is only a drawing in the
   * operator's browser — describing a timing problem is the thing that was
   * not working in the first place. Sent down the socket it already has, it
   * becomes a file on the machine running the server, which is where
   * somebody helping can actually open it.
   */
  const save = () => {
    controller.socket?.emit('trace:save', events, (error, file) => {
      setSaved(error ? `nie zapisano: ${error}` : file);
    });
  };
  const now = Date.now();

  const bars = pressBars(events, now);
  // A row each, in the order they were first pressed, so the rows do not
  // jump about while somebody is watching them.
  const used = [...new Set(bars.map((bar) => bar.key))];
  const answers = responseTimes(events);
  const answered = answers.filter((answer) => answer.ms !== null).map((answer) => answer.ms);
  const missed = answers.filter((answer) => answer.ms === null).length;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-2 left-2 z-50 rounded-ctl border border-line bg-surf px-3 py-1 text-cap text-mut"
      >
        Zapis jogu
      </button>
    );
  }

  return (
    <div className="fixed inset-x-2 bottom-2 z-50 flex flex-col gap-1.5 rounded-ctl border border-line bg-surf p-3">
      <div className="flex items-baseline gap-3">
        <span className="text-label font-semibold uppercase text-ink">Zapis jogu</span>
        <span className="font-num text-note text-mut">
          {WINDOW_MS / 1000} s · reakcja{' '}
          {answered.length ? `${Math.min(...answered)}–${Math.max(...answered)} ms` : '—'}
          {missed ? ` · bez ruchu: ${missed}` : ''} · droga {travelled(events).toFixed(1)} mm
        </span>
        <span className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={save}
            className="rounded-ctl border border-line px-2 py-0.5 text-cap text-mut hover:text-ink"
          >
            Zapisz
          </button>
          <button
            type="button"
            onClick={clear}
            className="rounded-ctl border border-line px-2 py-0.5 text-cap text-mut hover:text-ink"
          >
            Wyczyść
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-ctl border border-line px-2 py-0.5 text-cap text-mut hover:text-ink"
          >
            Schowaj
          </button>
        </span>
      </div>

      {used.map((key) => (
        <Row key={key} label={LABELS[key] ?? key}>
          <Keys bars={bars.filter((bar) => bar.key === key)} now={now} />
        </Row>
      ))}
      {used.length ? null : <Row label="klawisz">{null}</Row>}
      <Row label="na port"><Wire events={events} now={now} /></Row>
      <Row label="maszyna"><Move events={events} now={now} /></Row>

      {saved ? (
        <p className="m-0 font-num text-cap text-ink">Zapisano: {saved}</p>
      ) : null}

      <p className="m-0 text-cap text-mut">
        Czas biegnie w prawo, prawa krawędź to teraz. Góra — trzymany klawisz,
        środek — każdy segment wysłany do sterownika (żółta kreska: anulowanie),
        dół — rzeczywisty ruch X (niebieski) i Y (zielony). Przesunięcie między
        pasami to opóźnienie.
      </p>
    </div>
  );
};

export default JogTrace;
