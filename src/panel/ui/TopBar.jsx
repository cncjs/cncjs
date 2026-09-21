import Button from './Button';
import StateChip from './StateChip';

/**
 * The bar across the top: what the machine is, what it is loaded with, and
 * the way to make it stop.
 *
 * The stop is held against the right-hand edge and is the only solid red on
 * the panel. On a machine the most dangerous control gets the most
 * predictable place, and it is on every screen for the same reason.
 */
const TopBar = ({ status, file, note, theme, onToggleTheme, canStop, onStop }) => (
  <header className="flex shrink-0 items-center gap-[10px] border-b border-line bg-panel px-[10px] py-2">
    <StateChip tone={status.tone}>{status.word}</StateChip>

    <div className="flex min-w-0 flex-1 items-center gap-[10px] px-[14px]">
      <span className="truncate font-num text-base text-mut">{file}</span>
      {note ? <span className="truncate font-num text-base text-acc">· {note}</span> : null}
    </div>

    <button
      type="button"
      aria-label={theme === 'dark' ? 'Jasny motyw' : 'Ciemny motyw'}
      onClick={onToggleTheme}
      className="h-btnh w-ctl shrink-0 rounded-ctl border border-line bg-field text-lead text-mut hover:border-acc hover:text-acc"
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>

    <Button
      tone="stop"
      disabled={!canStop}
      onClick={onStop}
      className="h-btnh px-10 text-lead font-bold tracking-[0.12em]"
    >
      Stop
    </Button>
  </header>
);

export default TopBar;
