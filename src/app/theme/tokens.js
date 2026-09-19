/**
 * Every visual constant in the new UI starts here.
 *
 * Nothing outside this file is allowed to write a colour, a font size, a
 * weight, a letter spacing or a border width — components read them from the
 * theme, and the theme is built from these. A hex code appearing in a
 * component is a bug, not a shortcut, and the lint rules under
 * `src/app/components/` enforce it.
 *
 * The values are the ones the design mockup uses, not approximations of them.
 * Anything that is not in the mockup is not here either: this file grows as
 * screens land, so an unused token is a decision made before it was needed.
 */

/**
 * The system stack, deliberately, and not the mockup's IBM Plex.
 *
 * The machine this runs on sits in a garage and may have no internet, so a web
 * font would silently fall back and the panel would look different there than
 * anywhere it was designed. The mockup's faces are illustrative; the shape of
 * the typography — uppercase spaced labels, monospace tabular numbers — is
 * what is binding, and the system stack carries it. One token to change when
 * someone picks a face and decides how to ship it.
 */
export const fontFamily = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  // A machine readout must not reflow as digits change, so every numeric face
  // is monospace and every numeric style asks for tabular figures on top —
  // some stacks fall through to a proportional face.
  mono: 'ui-monospace, SFMono-Regular, "Cascadia Mono", Consolas, "Liberation Mono", "Courier New", monospace',
};

export const color = {
  // Surfaces, lightest content on darkest ground.
  surface: '#f4f5f6',
  panel: '#ffffff',
  panelHeader: '#eef2f6',

  text: '#14181c',
  textMuted: '#5b666f',

  // Three weights of rule. `border` is the panel edge, `borderControl` the
  // heavier edge a control needs to read as pressable, `borderSubtle` the
  // divider inside a panel.
  border: '#c7ccd1',
  borderControl: '#9aa4ad',
  borderSubtle: '#e3e6e9',

  accent: '#1e6fd0',
  accentHover: '#14538f',
  accentTint: '#eef2f6',
  onAccent: '#ffffff',

  danger: '#c02a20',
  dangerHover: '#9e2018',

  // Distinct from the accent on purpose: a focus ring that matches the
  // primary colour disappears the moment it lands on a primary button.
  focusRing: '#4ea3ff',
};

export const fontSize = {
  label: '11px',
  small: '12px',
  body: '15px',
  control: '14px',
  panelTitle: '13px',
  screenTitle: '20px',
};

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
};

export const letterSpacing = {
  // Uppercase runs need tracking to stay readable; the tighter value is for
  // the longer strings, where the looser one starts to fall apart into
  // separate letters.
  label: '0.14em',
  title: '0.12em',
  control: '0.1em',
};

export const lineHeight = {
  body: 1.5,
  tight: 1.2,
};

export const border = {
  // Square corners are the whole grammar of this panel: it is an instrument,
  // not a phone. There is no radius token because there is no radius.
  hairline: '1px',
  emphasis: '2px',
};

export const focus = {
  ringWidth: '2px',
  ringOffset: '2px',
};

/**
 * Controls are sized for a finger as readily as a pointer, because the same
 * screen runs on the laptop and on a panel next to the machine. This is not a
 * touch mode — there is no density switch and no second set of styles.
 */
export const size = {
  // The widest a single column of content is allowed to get. A form does not
  // become easier to read by spanning a 27-inch monitor.
  column: '420px',
  control: '46px',
  controlLarge: '52px',
};

// MUI's spacing unit. The mockup's rhythm is built on 8 with half steps.
export const spacingUnit = 8;
