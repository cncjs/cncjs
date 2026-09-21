import Button from './Button';
import StateChip from './StateChip';

/**
 * The bar across the top: the machine.
 *
 * What state it is in, what the panel is talking to, and the way to make it
 * stop. One subject a strip — the job lives along the bottom, with the file
 * it is running and the button that starts it. Before, the file was up here
 * and its Start was down there, which put a cause and its effect at opposite
 * ends of the screen.
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
 * The state chip is the top of the same column the rail continues below it,
 * so the bar's left padding is the chip's inset inside that column rather
 * than an indent of the whole bar: 6px in, 6px out, and the column is the
 * rail's own width. On a phone there is no rail to line up with and the chip
 * has no box, so it keeps the bar's ordinary margin instead.
 */
const TopBar = ({ status, machine, canStop, onStop }) => (
  <header className="flex shrink-0 items-center gap-[10px] border-b border-line bg-panel py-2 pl-[10px] pr-[10px] @3xl/shell:pl-1.5">
    <StateChip tone={status.tone}>{status.word}</StateChip>

    {/* Top left, a line each. Which controller and which port are two
      * separate facts and read faster stacked than joined with a dot; kept
      * against the top edge they sit where a heading would, which is what
      * they are for this strip. */}
    <div className="flex min-w-0 flex-1 flex-col items-start justify-start gap-0.5 self-start px-1 pt-0.5 @3xl/shell:px-[14px]">
      {/* What the panel is talking to. It does not change while anyone is
        * working, which is exactly why it belongs on the strip you do not
        * look at — and why it was the wrong thing to put on the one that
        * reports the job. */}
      {machine.map((line) => (
        <span
          key={line}
          className="max-w-full truncate font-num text-base leading-tight text-mut fullhd:text-head @3xl/shell:text-lead"
        >
          {line}
        </span>
      ))}
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
