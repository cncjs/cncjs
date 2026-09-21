import Button from './Button';
import Meter from './Meter';

/**
 * The line along the bottom: the job.
 *
 * What is loaded, how far through it is, and the button that starts it — one
 * subject a strip, with the machine itself along the top. The file used to be
 * in the header and its Start down here, which put a cause and its effect at
 * opposite ends of the screen.
 *
 * It is also the only place progress appears away from the dashboard. A job
 * runs for minutes while an operator is on the jog screen or the toolpath, and
 * this is the strip they can see from all of them.
 *
 * Start is the only green on the panel and sits at the opposite end from the
 * stop, which is the whole of the arrangement: the two things that change what
 * the machine is doing are as far apart as the frame allows.
 *
 * Failures are said here too, in red, rather than in a banner above the
 * screen. A banner is a band of height that appears and disappears, and every
 * card on every screen is then laid out against a frame that changes size when
 * something goes wrong — which is the moment an operator can least afford the
 * controls to move. This line is always there and only its words change.
 */
const StatusBar = ({ job, error, canStart, onStart, canPause, onPause, className = '' }) => (
  <footer className={`flex h-[49px] shrink-0 items-center gap-gap border-t border-line bg-panel px-[14px] ${className}`}>
    <span className={`min-w-0 truncate font-num text-base ${error ? 'text-red' : 'text-mut'}`}>
      {error || (job ? job.name : 'brak wczytanego pliku')}
    </span>

    {/* Only once there is something to be through. A bar at zero beside a file
      * that has not been started is a claim that it has, and stalled. */}
    {job && !error ? (
      <>
        <span className="shrink-0 font-num text-base text-mut">
          <span className="text-ink">{job.percent}</span>
          {' % · linia '}
          <span className="text-ink">{job.received}</span>
          /{job.total}
        </span>
        <span className="min-w-0 flex-1">
          <Meter percent={job.percent} label="Przebieg zadania" tone="bg-grn" />
        </span>
      </>
    ) : <span className="flex-1" />}

    {/* Nothing rather than a dash. A lone `–` on an otherwise empty strip is
      * a reading whose subject nobody can name — which is how the top bar's
      * file slot read before it was given words. */}
    {job && !error ? (
      <span className="shrink-0 font-num text-base text-mut">
        pozostało <span className="text-ink">{Math.round(job.remaining / 60)}</span> min
      </span>
    ) : null}

    <Button tone="go" disabled={!canStart} onClick={onStart} className="h-9 tracking-[0.12em]">
      Start zadania
    </Button>
    <Button disabled={!canPause} onClick={onPause} className="h-9">
      Pauza
    </Button>
  </footer>
);

export default StatusBar;
