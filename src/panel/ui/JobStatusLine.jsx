import Button from './Button';
import Meter from './Meter';

/**
 * What the status bar says when no screen has anything better to say.
 *
 * The job: what is loaded, how far through it is, how long is left, and the
 * two buttons that change it. This is the default contributor to the bar
 * rather than a fixed part of it — a screen that fills the slot replaces all
 * of this, because half a job line beside somebody else's facts is two
 * subjects on one strip.
 *
 * Start is the only green on the panel and sits at the opposite end from the
 * stop, which is the whole of the arrangement: the two things that change what
 * the machine is doing are as far apart as the frame allows.
 *
 * Failures are said here too, in red, rather than in a banner above the
 * screen. A banner is a band of height that appears and disappears, and every
 * card on every screen is then laid out against a frame that changes size when
 * something goes wrong — which is the moment an operator can least afford the
 * controls to move.
 */
const JobStatusLine = ({ job, error, canStart, onStart, canPause, onPause }) => (
  <>
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
        {/* Nothing rather than a dash. A lone `–` on an otherwise empty strip
          * is a reading whose subject nobody can name. */}
        <span className="shrink-0 font-num text-base text-mut">
          pozostało <span className="text-ink">{Math.round(job.remaining / 60)}</span> min
        </span>
      </>
    ) : <span className="flex-1" />}

    <Button tone="go" disabled={!canStart} onClick={onStart} className="h-9 tracking-[0.12em]">
      Start zadania
    </Button>
    <Button disabled={!canPause} onClick={onPause} className="h-9">
      Pauza
    </Button>
  </>
);

export default JobStatusLine;
