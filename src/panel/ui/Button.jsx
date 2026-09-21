/**
 * Every button on the panel that is not a jog key or a step chip.
 *
 * One component rather than a class string copied into each widget. The
 * mockup uses five fills and they mean things: accent is the action a screen
 * is for, outline is the one beside it, soft is an action that will exist but
 * does not yet, green starts work and red stops it. Those are decisions about
 * the machine, not about colour, and they belong in one file where changing
 * one changes all of them.
 *
 * A disabled outline button dims; a disabled filled one goes grey. Dimming a
 * fill only washes it out, and a pale red STOP still reads as a stop that can
 * be pressed. Grey is the panel's word for "not now".
 */
const OFF = 'disabled:border-mut disabled:bg-mut disabled:text-white disabled:hover:brightness-100';

const TONES = {
  primary: `border border-acc bg-acc text-white hover:brightness-95 ${OFF}`,
  outline: 'border border-line bg-panel text-ink hover:border-acc hover:text-acc ' +
    'disabled:opacity-45 disabled:hover:border-line disabled:hover:text-ink',
  soft: `border border-acc bg-accS text-acc hover:brightness-95 ${OFF}`,
  go: `border border-grn bg-grn text-white hover:brightness-95 ${OFF}`,
  stop: `border border-red bg-red text-white hover:brightness-90 ${OFF}`,
};

const Button = ({ tone = 'outline', className = '', children, ...rest }) => (
  <button
    type="button"
    className={[
      'shrink-0 rounded-ctl px-6 text-base font-semibold uppercase tracking-[0.1em]',
      TONES[tone],
      className,
    ].join(' ')}
    {...rest}
  >
    {children}
  </button>
);

export default Button;
