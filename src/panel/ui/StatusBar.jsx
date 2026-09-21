/**
 * The line along the bottom: the last thing that happened, and the one action
 * that starts work.
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
import Button from './Button';

const StatusBar = ({ message, error, canStart, onStart, className = '' }) => (
  <footer className={`flex h-[49px] shrink-0 items-center gap-gap border-t border-line bg-panel px-[14px] ${className}`}>
    <span className={`min-w-0 flex-1 truncate font-num text-base ${error ? 'text-red' : 'text-mut'}`}>
      {error || message}
    </span>
    <Button tone="go" disabled={!canStart} onClick={onStart} className="h-9 tracking-[0.12em]">
      Start zadania
    </Button>
  </footer>
);

export default StatusBar;
