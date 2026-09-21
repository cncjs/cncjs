/**
 * Tailwind for the panel, and for nothing else.
 *
 * Every value here points at a CSS custom property defined in
 * `src/panel/styles/tokens.css`, which is a copy of the mockup's own `:root`.
 * Nothing is duplicated: the token sheet decides, Tailwind only gives the
 * tokens names a component can write.
 *
 * That indirection is what makes the mockup's four switchable axes work —
 * theme, density, target, number face are attribute changes on the root, and a
 * utility class compiled to `var(--acc)` follows them without a rebuild. A
 * config that inlined `#1557c0` would freeze the light theme into every class.
 *
 * The acceptance rule from `HANDOFF-TODO.md`: no `#hex` and no `text-[13px]`
 * in a component. If a value is needed and is not here, it belongs in the
 * token sheet first.
 */
module.exports = {
  content: ['./src/panel/**/*.{js,jsx,html}'],
  // The mockup switches with an attribute, not a class.
  darkMode: ['variant', '&:where([data-theme="dark"], [data-theme="dark"] *)'],
  theme: {
    // Replaced, not extended: Tailwind's default palette is a hundred colours
    // nobody chose, and leaving it in place means `bg-slate-200` compiles.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      bg: 'var(--bg)',
      surf: 'var(--surf)',
      panel: 'var(--panel)',
      line: 'var(--line)',
      field: 'var(--field)',
      ink: 'var(--ink)',
      mut: 'var(--mut)',
      acc: 'var(--acc)',
      accS: 'var(--accS)',
      red: 'var(--red)',
      grn: 'var(--grn)',
      amb: 'var(--amb)',
      white: '#ffffff',
    },
    borderRadius: {
      none: '0',
      ctl: 'var(--r-ctl)',
      card: 'var(--r-card)',
      full: '9999px',
    },
    fontFamily: {
      sans: ["'IBM Plex Sans'", 'system-ui', 'sans-serif'],
      num: 'var(--num)',
    },
    extend: {
      spacing: {
        pad: 'var(--pad)',
        gap: 'var(--gap)',
        rail: 'var(--rail)',
        dro: 'var(--dro)',
        side: 'var(--side)',
        side2: 'var(--side2)',
        btn: 'var(--btn)',
        btnh: 'var(--btnh)',
        chip: 'var(--chip)',
        chipw: 'var(--chipw)',
        ctl: 'var(--ctl)',
        chiph: 'var(--chiph)',
        jbtn: 'var(--jbtn)',
        jbtnh: 'var(--jbtnh)',
        jgap: 'var(--jgap)',
        jpad: 'var(--jpad)',
        jcard: 'var(--jcard)',
        frame: 'var(--w)',
        frameh: 'var(--h)',
      },
      fontSize: {
        // The panel's type scale. Three sizes carry almost everything: a
        // label, body, and the reading a screen is about.
        label: ['10px', { letterSpacing: '0.14em' }],
        cap: ['11px', { letterSpacing: '0.08em' }],
        note: ['12px', { lineHeight: '1.5' }],
        base: ['13px', { lineHeight: '1.5' }],
        lead: ['15px', { lineHeight: '1.4' }],
        // The one word on the panel that has to be read from across the
        // room without looking for it. The drawing sets the stop at 22px
        // and everything else well below that.
        head: ['22px', { lineHeight: '1' }],
        val: ['var(--val)', { lineHeight: '1' }],
        dro: ['var(--dro)', { lineHeight: '0.9' }],
      },
      borderWidth: {
        DEFAULT: '1px',
      },
    },
  },
  plugins: [
    /*
     * `fullhd:` and `phone:`, matching the drawing's `data-target`.
     *
     * Sizes in the token sheet already follow the target — `--rail`, `--pad`,
     * `--btnh` all move. Type does not: the scale is in fixed pixels, so a
     * control whose box grows from 72px to 112px keeps an 11px word inside
     * it and reads as a large box around something small. This is how type
     * follows the format too, and it is an attribute variant for the same
     * reason the theme is.
     */
    ({ addVariant }) => {
      addVariant('fullhd', '&:where([data-target="fullhd"], [data-target="fullhd"] *)');
      addVariant('phone', '&:where([data-target="phone"], [data-target="phone"] *)');
    },
    /*
     * Container queries, and they are not a nicety here.
     *
     * A widget is one component that appears both as a tile on the dashboard
     * and as a whole screen of its own, and it has to lay itself out from the
     * room it is given rather than from the size of the window. A viewport
     * breakpoint cannot tell those apart — the window is 1024px wide in both
     * cases and the widget has 374px in one and 863px in the other.
     */
    require('@tailwindcss/container-queries'),
  ],
};
