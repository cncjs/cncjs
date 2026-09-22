import Button from './Button';
import StateChip from './StateChip';
import { t } from '../i18n';

/**
 * The one thing on this bar that is a problem rather than a fact.
 *
 * It used to be written as two more identity lines — same muted type as
 * `sterownik · Grbl` — which is the form Mateusz rejected on 2026-09-21:
 * a panel that cannot reach its machine was saying so in the voice it uses
 * for settings nobody reads. Amber rather than red: there is nothing to stop
 * and nothing has gone wrong on the machine, but it is the reason every
 * control below is dead and it has to be found without looking for it.
 */
const Warning = ({ children }) => (
  <span className="ml-1 min-w-0 truncate @3xl/shell:ml-[14px] rounded-ctl border border-amb bg-ambS px-3 py-1 text-base font-semibold uppercase tracking-[0.08em] text-amb fullhd:text-lead">
    {children}
  </span>
);

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
const TopBar = ({ status, machine, warning, canStop, onStop }) => (
  <header className="flex shrink-0 items-center gap-[10px] border-b border-line bg-panel py-2 pl-[10px] pr-[10px] @3xl/shell:pl-1.5">
    <StateChip tone={status.tone}>{status.word}</StateChip>

    {/* Top left, a line each. Which controller and which port are two
      * separate facts and read faster stacked than joined with a dot; kept
      * against the top edge they sit where a heading would, which is what
      * they are for this strip. */}
    {/* Outside the identity column rather than inside it. That column is
      * deliberately held against the top edge, where two stacked lines read
      * as a heading; one badge up there sits high against a chip and a stop
      * that are both centred. The two are never on screen together, so this
      * takes the bar's own centring instead. */}
    {warning ? <Warning>{warning}</Warning> : null}

    <div className="flex min-w-0 flex-1 flex-col items-start justify-start gap-0.5 self-start px-1 pt-0.5 @3xl/shell:px-[14px]">
      {/* What the panel is talking to. It does not change while anyone is
        * working, which is exactly why it belongs on the strip you do not
        * look at — and why it was the wrong thing to put on the one that
        * reports the job. */}
      {machine.map(({ label, value }) => (
        <span
          key={value}
          className="max-w-full truncate font-num text-base leading-tight text-mut fullhd:text-head @3xl/shell:text-lead"
        >
          {/* Named, in the panel's usual `label · value` form. Two bare
            * words in a corner are a guess — `Grbl` could be anything and
            * `COM3` is only obvious once you already know what it is. */}
          {label ? `${label} · ` : ''}
          <span className="text-ink">{value}</span>
        </span>
      ))}
    </div>

    <Button
      tone="stop"
      disabled={!canStop}
      onClick={onStop}
      className="h-chiph px-4 text-lead font-bold tracking-[0.12em] @3xl/shell:h-btnh @3xl/shell:px-10 @3xl/shell:text-head"
    >
      {t('topbar.stop')}
    </Button>
  </header>
);

export default TopBar;
