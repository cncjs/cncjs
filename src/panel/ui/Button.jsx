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

/**
 * A prop rather than a class passed in, and this is not a preference.
 *
 * Two padding utilities in one string do not resolve in the order they are
 * written — the generated stylesheet decides, and `px-6` wins over a `px-0`
 * appended after it. Measured on the zeroing screen: `XYZ` on a 60px button
 * had a 12px content box, so the label overflowed and clamped against the
 * left edge while `X` beside it sat centred, and the row read as three
 * centred buttons and two broken ones.
 *
 * `compact` is for a button that takes its width from the row it is in
 * rather than from its own label — a set of equal columns, where the
 * horizontal padding is a minimum width nobody asked for.
 */
/*
 * `href` makes it a link, and that is not cosmetic.
 *
 * Fetching the certificate is a navigation: the browser has to see a real
 * download, with the file's own media type, for Android to offer to install
 * it rather than drop it in a folder. A button calling `location.assign`
 * looks the same and behaves differently, and this is the one control on the
 * panel whose whole job is to hand a file to the operating system.
 *
 * Both render the same face — a link that reads as a link would be the odd
 * one out on a panel where everything else is a control.
 */
const Button = ({ tone = 'outline', compact = false, href, className = '', children, ...rest }) => {
  const face = [
    'flex shrink-0 items-center justify-center rounded-ctl text-center',
    'text-base font-semibold uppercase tracking-[0.1em]',
    compact ? 'px-1' : 'px-6',
    TONES[tone],
    className,
  ].join(' ');

  if (href) {
    return (
      <a href={href} download className={face} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" className={face} {...rest}>
      {children}
    </button>
  );
};

export default Button;
