import Button from './Button';
import StateChip from './StateChip';

/**
 * The bar across the top: what the machine is, what it is loaded with, and
 * the way to make it stop.
 *
 * The stop is held against the right-hand edge and is the only solid red on
 * the panel. On a machine the most dangerous control gets the most
 * predictable place, and it is on every screen for the same reason.
 *
 * Narrow, the bar gets shorter and the loaded-file note is dropped — but the
 * stop keeps a full-sized target. Everything here can give up room except the
 * one control somebody reaches for without looking.
 *
 * Its word is 22px at the panel, which is larger than anything else in the
 * frame and is the drawing's own size. Measured against it: at `lead` the
 * button was 124px wide where the drawing has 150, and read as the smaller
 * control even though its box was taller.
 */
const TopBar = ({ status, file, note, theme, onToggleTheme, canStop, onStop }) => (
  <header className="flex shrink-0 items-center gap-[10px] border-b border-line bg-panel px-[10px] py-2">
    <StateChip tone={status.tone}>{status.word}</StateChip>

    <div className="flex min-w-0 flex-1 items-center gap-[10px] px-1 @3xl/shell:px-[14px]">
      <span className="truncate font-num text-note text-mut @3xl/shell:text-base">{file}</span>
      {note ? <span className="hidden truncate font-num text-base text-acc @3xl/shell:inline">· {note}</span> : null}
    </div>

    <button
      type="button"
      aria-label={theme === 'dark' ? 'Jasny motyw' : 'Ciemny motyw'}
      onClick={onToggleTheme}
      className="h-chiph w-ctl shrink-0 rounded-ctl border border-line bg-field text-lead text-mut hover:border-acc hover:text-acc @3xl/shell:h-btnh"
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>

    <Button
      tone="stop"
      disabled={!canStop}
      onClick={onStop}
      className="h-chiph px-4 text-lead font-bold tracking-[0.12em] @3xl/shell:h-btnh @3xl/shell:px-10 @3xl/shell:text-head"
    >
      Stop
    </Button>
  </header>
);

export default TopBar;
