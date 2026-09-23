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
 * The acceptance rule the handoff set out: no `#hex` and no `text-[13px]`
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
      /*
       * The state colours, quietened to a wash.
       *
       * Derived here rather than added to the token sheet, because they are
       * not decisions — they are the same four colours the sheet already
       * names, mixed into the surface behind them. `--accS` is the drawing's
       * own example of the idea; these are the rest of the set, and they
       * follow the theme because their inputs do.
       */
      grnS: 'color-mix(in srgb, var(--grn) 12%, var(--surf))',
      redS: 'color-mix(in srgb, var(--red) 12%, var(--surf))',
      ambS: 'color-mix(in srgb, var(--amb) 12%, var(--surf))',
      mutS: 'color-mix(in srgb, var(--mut) 10%, var(--surf))',
      /*
       * The dim behind a sheet. Mixed rather than written as `bg-ink/45`,
       * because an opacity modifier needs colour channels and every colour
       * here is a whole `var()` — the modifier silently produces nothing,
       * which is what a transparent scrim looked like.
       */
      scrim: 'color-mix(in srgb, var(--ink) var(--scrimA), transparent)',
      /*
       * A readable backing over the drawing, for the same reason `scrim` is
       * mixed rather than written as an opacity modifier: every colour here
       * is a whole `var()`, so `bg-panel/70` resolves to nothing at all.
       * Measured — it computes to `rgba(0, 0, 0, 0)`.
       */
      wash: 'color-mix(in srgb, var(--panel) 72%, transparent)',
      red: 'var(--red)',
      grn: 'var(--grn)',
      amb: 'var(--amb)',
      white: '#ffffff',
    },
    borderRadius: {
      none: '0',
      ctl: 'var(--r-ctl)',
      card: 'var(--r-card)',
      jcorner: 'var(--r-jcorner)',
      full: '9999px',
    },
    fontFamily: {
      sans: ["'IBM Plex Sans'", 'system-ui', 'sans-serif'],
      num: 'var(--num)',
    },
    extend: {
      width: {
        coord: 'var(--coord)',
        dialog: 'var(--dialogw)',
        hazard: 'var(--hazard-w)',
      },
      height: {
        hazard: 'var(--hazard-w)',
      },
      inset: {
        /*
         * The tape sits one band's width outside the preview. Written as an
         * explicit negative rather than as `-inset-hazard`: Tailwind builds
         * its negative variants by prefixing, and it will not negate a value
         * that is a bare `var()` — the class is simply not generated, and the
         * element collapsed to nothing inside a 528x423 box.
         */
        tape: 'calc(var(--hazard-w) * -1)',
      },
      backgroundImage: {
        // Diagonal hazard tape. The stripe is twice the band's own width, so
        // it reads as a stripe rather than as a texture.
        hazard: 'repeating-linear-gradient(45deg, var(--hazard) 0 var(--hazard-w), var(--hazard-dark) var(--hazard-w) calc(var(--hazard-w) * 2))',
      },
      spacing: {
        hazard: 'var(--hazard-w)',
        pad: 'var(--pad)',
        // The strip the phone menu's mound is drawn in. See `--navEdge`.
        navEdge: 'var(--navEdge)',
        // How deep the section's bite is. See `--navBite`.
        navBite: 'var(--navBite)',
        // The content area's margin from the screen edge. See `--shellPad`.
        shellPad: 'var(--shellPad)',
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
        /*
         * The state chip's width: the rail's column, inset either side so
         * the chip sits in the column rather than filling it edge to edge.
         * Derived, so it keeps following `--rail` when a target changes it.
         */
        railInset: 'calc(var(--rail) - 12px)',
        /*
         * How far the phone's menu is parked below the screen.
         *
         * Eleven destinations in a grid five wide is three rows; one of them
         * is showing, so two are hidden and the menu rises by exactly that
         * when it opens. Derived from `--btnh`, so it keeps following the
         * row height when a target changes it.
         *
         * If a twelfth destination ever appears this becomes three rows.
         * There is no way to say `ceil(n / 5) - 1` in a stylesheet, and a
         * class assembled at runtime is one Tailwind never sees — so the
         * arithmetic lives here, with the count it depends on written down.
         */
        navHidden: 'calc(var(--btnh) * 2)',
        /*
         * The strip a phone will not let anything be drawn in.
         *
         * A rounded screen cuts the corners off the bottom row, and the panel
         * asks for the whole display with `viewport-fit=cover` — so it is the
         * panel's job to keep out of it: *"na telefonie przyciski sa bardzo
         * blisko krawedzi i na zaokroglonym ekranie telefonu prawie wychodza
         * za ekran"*. Zero on everything that is not a phone.
         */
        safeB: 'env(safe-area-inset-bottom, 0px)',

        /*
         * And the other edge, for the same reason.
         *
         * The menu had kept itself off the bottom since the rounded-corner
         * round; the top bar had nothing, so on a notched phone asking for
         * the whole display it ran underneath the notch. Padding it on the
         * `body` instead was the first try and showed the page colour as a
         * grey strip above the bar — the edge belongs to whatever is drawn
         * against it.
         */
        safeT: 'env(safe-area-inset-top, 0px)',
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
        // A machine reading when it is not the subject of the screen —
        // three of them across a phone, beside the keys that are. The
        // drawing's own size there.
        read: ['19px', { lineHeight: '1.2' }],
        // The same reading where the strip is wide. Measured against the
        // longest coordinate this panel can show: at 28px it comes within
        // four pixels of the divider beside it and at 31 it crosses.
        readWide: ['26px', { lineHeight: '1.2' }],
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
     * A scroller with no bar down its side.
     *
     * The panel says "there is more" with a fade instead — see `FadeScroller`,
     * which is the only thing that uses this. A browser's own bar is drawn by
     * the browser rather than from the token sheet, appears on a desktop and
     * not on a phone, and sits over the content it measures.
     *
     * Two declarations because no browser reads both: `scrollbar-width` is
     * the standard one and the pseudo-element is what Chrome and Safari
     * actually answer to. Chrome 121 understands both, and the phone this is
     * for does not.
     */
    ({ addUtilities }) => {
      /*
       * The bite the content section takes out of its own bottom edge.
       *
       * **The mound belongs to the menu; the bite belongs to the section**, and
       * they are two separate things a fixed distance apart — *"wgryzienie nie
       * jest zamiast garba, garb jest elementem menu, wgryzienie jest elementem
       * sekcji/kontenera kontentu, z rownym odstepem rowny gap"* (2026-09-23).
       *
       * So this is the bar's own outline — the same control points, in the same
       * 500x30 box that stretches to the width — used as a mask on the section
       * above it. The section stops `--gap` short of the bar, and its edge then
       * rides over the mound at the same `--gap`, so the strip of page between
       * the two curves is the same width everywhere.
       *
       * Two layers: solid for everything but the last `--navEdge`, and the
       * outline for the strip the mound reaches into.
       */
      const svg = (body) => "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' "
        + "viewBox='0 -12 500 42' preserveAspectRatio='none'>" + body + "</svg>\")";

      // What the section keeps: everything above the bite.
      const KEEP = svg("<path d='M0 13.5A7.7 6 0 0 0 7.7 19.5L150 19.5L157.7 19.4L164.5 18.9L170.3 18.3L175.3 17.5L179.6 16.5L183.3 15.4L186.6 14.3L189.5 13L192.3 11.6L194.9 10.1L197.6 8.4L200.4 6.7L203.5 4.8L206.8 2.8L210.5 0.9L214.6 -1L219.2 -2.7L224.3 -4.2L229.9 -5.4L236.1 -6.3L242.7 -6.8L250 -7L257.3 -6.8L263.9 -6.3L270.1 -5.4L275.7 -4.2L280.8 -2.7L285.4 -1L289.5 0.9L293.2 2.8L296.5 4.8L299.6 6.7L302.4 8.4L305.1 10.1L307.7 11.6L310.5 13L313.4 14.3L316.7 15.4L320.4 16.5L324.7 17.5L329.7 18.3L335.5 18.9L342.3 19.4L350 19.5L492.3 19.5A7.7 6 0 0 0 500 13.5V-12H0Z' fill='%23000'/>");

      /*
       * And the line along it, as a mask rather than a picture.
       *
       * A data URI cannot read `var(--line)`, so the colour comes from the
       * element and this only says where to put it. Half a pixel deeper than
       * the cut, so the cut does not take half the line with it.
       */
      const LINE = svg("<path d='M0 13A7.7 6 0 0 0 7.7 19L150 19L157.7 18.9L164.4 18.4L170.2 17.8L175.1 17L179.4 16L183.1 15L186.3 13.8L189.2 12.6L191.9 11.2L194.5 9.7L197.2 8L200 6.3L203.1 4.4L206.4 2.4L210.2 0.5L214.3 -1.4L219 -3.2L224.1 -4.7L229.8 -5.9L236 -6.8L242.7 -7.3L250 -7.5L257.3 -7.3L264 -6.8L270.2 -5.9L275.9 -4.7L281 -3.2L285.7 -1.4L289.8 0.5L293.6 2.4L296.9 4.4L300 6.3L302.8 8L305.5 9.7L308.1 11.2L310.8 12.6L313.7 13.8L316.9 15L320.6 16L324.9 17L329.8 17.8L335.6 18.4L342.3 18.9L350 19L492.3 19A7.7 6 0 0 0 500 13' fill='none' stroke='%23000' stroke-width='1' vector-effect='non-scaling-stroke'/>");
      /*
       * The bite, and the line along it, both belonging to the content area.
       *
       * On `main` rather than on the last card, and that is the correction:
       * the card is not always the thing that ends at the bottom. On the
       * settings screen it is taller than the screen and scrolls, so its own
       * bottom — and with it the bite — was somewhere below the phone, while
       * the outline stayed parked at the foot of the display and was drawn
       * straight across the certificate fingerprint. Reported with a
       * photograph of exactly that: *"krzywa ma byc przyklejona do elementu a
       * nie stale w jednej pozycji na ekranie"*.
       *
       * `main` always ends where the content area ends, so both are glued to
       * it and to each other.
       *
       * Inset by `--shellPad` so the curve starts and stops where the cards
       * do. The strip outside that inset is left uncovered and therefore cut,
       * which costs nothing: there is only page out there.
       */
      const bite = {
        'mask-image': `linear-gradient(#000,#000),${KEEP}`,
        'mask-size': '100% calc(100% - var(--navBite)),calc(100% - 2 * var(--shellPad)) var(--navBite)',
        'mask-position': 'top left,var(--shellPad) bottom',
        'mask-repeat': 'no-repeat,no-repeat',
        position: 'relative',
        '&::after': {
          content: '""',
          position: 'absolute',
          left: 'var(--shellPad)',
          right: 'var(--shellPad)',
          bottom: '0',
          height: 'var(--navBite)',
          'background-color': 'var(--line)',
          'mask-image': LINE,
          'mask-size': '100% 100%',
          'mask-repeat': 'no-repeat',
          '-webkit-mask-image': LINE,
          '-webkit-mask-size': '100% 100%',
          '-webkit-mask-repeat': 'no-repeat',
        },
      };

      addUtilities({
        '.scroll-quiet': {
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
        '.mask-nav-bite': {
          ...bite,
          '-webkit-mask-image': bite['mask-image'],
          '-webkit-mask-size': bite['mask-size'],
          '-webkit-mask-position': bite['mask-position'],
          '-webkit-mask-repeat': bite['mask-repeat'],
        },
      });
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
