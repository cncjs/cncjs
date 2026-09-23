import Card from '../ui/Card';
import Button from '../ui/Button';
import DroStack from '../ui/DroStack';
import { zero, activeWcsNumber } from '../machine/zero';
import { t } from '../i18n';

/**
 * Where the work is, and saying so.
 *
 * `machine/zero.js` has existed and been tested since before there was a
 * screen for it; the Z card on the dashboard has been driving two thirds of
 * it from a corner. This is the whole of it in one place: every axis, alone
 * or together, against the reading it changes.
 *
 * **Nothing here moves the machine.** `G10 L20` rewrites the offset between
 * machine and work coordinates so that where the tool is *now* reads as zero.
 * That is what an operator means after jogging down onto the corner of the
 * stock, and it is why this screen needs no confirmation and no hazard frame
 * while the jog screen's travel-to-point does.
 *
 * One layout. Three readings and five buttons are the same column at 390px
 * and at 1920px — the DRO gives way, the buttons keep their height, and a
 * second layout would be this one with different gaps.
 *
 * The readout is `DroStack` unchanged rather than a row per axis with its own
 * button. A reading with a control welded to it is a different component from
 * the one every other screen shows, and the panel would then have two ways of
 * drawing a coordinate — which is the duplication that matters, not the two
 * lines of markup a shared button row costs.
 */

const ZeroScreen = ({ machine }) => {
  const { position, machinePosition, modal, connected, canSendGcode } = machine;

  /*
   * Which coordinate system, and the refusal when there is none.
   *
   * `G10 L20 P<n>` has to name the system the machine is working in. Zeroing
   * the wrong one is silent and is discovered by a tool moving to the wrong
   * place under power, so `zero.js` returns null rather than falling back to
   * P1 — and a button that would send nothing must not look like one that
   * sends something.
   */
  const wcs = modal.wcs || '';
  const knowsWcs = activeWcsNumber(modal) > 0;
  /*
   * And the second refusal, which is the server's rather than this panel's.
   *
   * In alarm every controller the server drives resets its feeder and drops
   * the line, so a press here would put `G10 L20` on the socket and change
   * nothing. Measured, after the button was built and pressed at an alarmed
   * machine — which is the only way this was ever going to be found.
   */
  const canZero = connected && knowsWcs && canSendGcode;

  /*
   * The face is the axis, the name is the sentence.
   *
   * `ZERUJ X` on a 110px button at 390px wraps onto two lines and leaves the
   * row a head taller than the one beneath it. The panel has already settled
   * this once, on the jog step chips: the face says what the drawing says and
   * `aria-label` says the whole thing, because a control read aloud without
   * its verb is the one thing on this panel that must never be ambiguous.
   * The card is titled `Zeroing` and the note under the readings says what
   * pressing one does, so on screen the letter is not short of context.
   *
   * The button takes what to do and what to say, and knows nothing about
   * axes. It was written to take the axis list and build both, which the lint
   * rule stopped and was right to: `axes={['x', 'y']}` is a data prop a
   * component only forwards, and the rule cannot tell that from an option
   * array an operator reads.
   *
   * Both keys are written out at each call rather than assembled.
   * `t(`zero.${axes.join('')}`)` would be shorter and would be a key nothing
   * can grep for: the resources test looks for quoted dotted literals, so
   * five real keys would read as five nobody asks for and a misspelt one
   * would reach an operator. Same reason the rail writes `nav.jog` out
   * instead of building it from an id.
   */
  const Zero = ({ face, name, onPress, together }) => (
    <Button
      tone={together ? 'outline' : 'primary'}
      aria-label={name}
      disabled={!canZero}
      onClick={onPress}
      className="h-ctl min-w-0 flex-1 px-0"
    >
      {face}
    </Button>
  );

  const zeroing = (...axes) => () => zero({ modal, axes });

  return (
    <Card
      label={t('zero.title')}
      aside={wcs || null}
      className="min-h-0 flex-1"
      bodyClassName="gap-4"
    >
      <DroStack position={position} machinePosition={machinePosition} />

      {/* Said once, on the screen the action lives on rather than in a help
        * sheet. Every other control on this panel that is enabled while a
        * machine is connected can move it, and the one that cannot should not
        * have to be trusted to be the exception. */}
      <p className="m-0 shrink-0 text-note text-mut">{t('zero.note')}</p>

      {/* The reason everything below is dead, where the dead things are.
        * Without it the screen is five grey buttons and no account of why —
        * and the two reasons need different answers from the operator, so
        * they are two sentences and not one apology. */}
      {connected && !canZero ? (
        <p className="m-0 shrink-0 rounded-ctl border border-amb bg-ambS px-4 py-3 text-base text-amb">
          {t(canSendGcode ? 'zero.noWcs' : 'zero.alarm')}
        </p>
      ) : null}

      {/* One row, and the fill does the grouping: the three filled ones are
        * an axis each, the two outlined ones are several at once. Three over
        * two was the first arrangement and it read as two unrelated rows of
        * controls — which they are not; they are the same action over
        * different sets. */}
      <div className="flex shrink-0 gap-2">
        <Zero face={t('axis.x')} name={t('zero.x')} onPress={zeroing('x')} />
        <Zero face={t('axis.y')} name={t('zero.y')} onPress={zeroing('y')} />
        <Zero face={t('axis.z')} name={t('zero.z')} onPress={zeroing('z')} />
        <Zero face={t('axis.xy')} name={t('zero.xy')} onPress={zeroing('x', 'y')} together />
        <Zero face={t('axis.xyz')} name={t('zero.xyz')} onPress={zeroing('x', 'y', 'z')} together />
      </div>
    </Card>
  );
};

export default ZeroScreen;
