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
 *
 * No theme switch. It is a setting, and a setting on the bar that carries
 * the stop is a control competing for the one place nobody should have to
 * look twice at.
 *
 * No left padding at the panel: the state chip is the top of the same
 * column the rail continues below it, and an indent would break the line
 * they make together. On a phone there is no rail to line up with and the
 * chip has no box, so it keeps its margin from the edge.
 */
const TopBar = ({ status, file, note, canStop, onStop }) => (
  <header className="flex shrink-0 items-center gap-[10px] border-b border-line bg-panel py-2 pl-[10px] pr-[10px] @3xl/shell:pl-0">
    <StateChip tone={status.tone}>{status.word}</StateChip>

    <div className="flex min-w-0 flex-1 items-center gap-[10px] px-1 @3xl/shell:px-[14px]">
      {/* Named when there is a file and said plainly when there is not. A
        * lone dash on an otherwise empty strip reads as a bar whose purpose
        * is unclear, which is exactly how it was reported. */}
      <span className="truncate font-num text-note text-mut fullhd:text-lead @3xl/shell:text-base">
        {file || 'brak wczytanego pliku'}
      </span>
      {note ? <span className="hidden truncate font-num text-base text-acc fullhd:text-lead @3xl/shell:inline">· {note}</span> : null}
    </div>

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
