/**
 * Mateusz's rule 8, as a rule rather than as an intention.
 *
 * Every string an operator reads comes out of the resource files through a
 * translation key. The panel was 40-odd literals deep the day the rule was
 * written, which is small; it is small because the panel has three screens.
 * Eight more screens without a gate is how a frontend ends up untranslatable,
 * and this repository already contains that outcome once.
 *
 * What is checked: text between JSX tags, string literals in JSX attributes,
 * and `label`/`title`-shaped properties in the plain `.js` data modules the
 * scene and the pads are built from. All three are places a displayed string
 * has actually been written here.
 *
 * What is not: a literal in an ordinary function call. `t('jog.home')` has to
 * be allowed, and telling it apart from a displayed string by looking at the
 * call it sits in is guesswork the rule would be wrong about in both
 * directions.
 */

/**
 * Attributes that are never read by anyone.
 *
 * An allowlist rather than a list of the display props, because the display
 * props are not knowable in advance: `does` on the shortcut sheet is one, and
 * nothing about the name says so. Listing what is *not* displayed means a
 * prop invented next week is covered without anyone remembering this file.
 *
 * Adding a name here is a claim that the value never reaches the screen, and
 * it is reviewed like any other change.
 */
const NOT_DISPLAYED = new Set([
  // Layout and identity.
  'className', 'bodyClassName', 'key', 'id', 'htmlFor', 'ref', 'slot',
  // ARIA that names a state rather than text.
  'role', 'aria-hidden', 'aria-modal', 'aria-live', 'aria-orientation',
  'aria-current', 'aria-pressed', 'aria-expanded', 'aria-selected', 'aria-checked',
  // Enumerations the component switches on.
  'type', 'tone', 'variant', 'align', 'name', 'frameloop', 'attach', 'memory',
  // SVG geometry and paint, which are drawing instructions.
  'd', 'viewBox', 'fill', 'stroke', 'strokeWidth', 'strokeLinecap',
  'strokeLinejoin', 'opacity', 'focusable', 'cx', 'cy', 'r', 'x', 'y',
  'width', 'height', 'transform', 'points', 'x1', 'x2', 'y1', 'y2',
]);

/** Object properties that hold a displayed string in the `.js` data modules. */
const DISPLAY_PROPERTIES = new Set(['label', 'title', 'placeholder', 'alt', 'does', 'unit']);

/** Attributes whose value is a list of class names rather than anything read. */
const CLASS_ATTRIBUTES = new Set(['className', 'bodyClassName']);

/**
 * A word: letters only, no digits, and none of the punctuation a class name
 * or an SVG path is built from.
 *
 * `text-white`, `@3xl/shell:bg-grnS` and `3h8v13H4zM4` are all things this
 * codebase writes as strings with spaces in them, and none of them is
 * language. Excluding a token because it mixes letters with digits or carries
 * a `-`, `:` or `/` leaves them with no words at all, while `Do zera` and
 * `mm/min` — sorry, `masz. mm` — keep theirs.
 */
const WORD = /^[^\W\d_]{2,}[.,;:!?)]?$/u;

/**
 * Is this string a sentence somebody wrote, rather than a value?
 *
 * Two words is the line. One word is an identifier, an axis name or a class;
 * two in a row is language, and language is the thing that has to be
 * translated. It is a heuristic, and it is here because the structural checks
 * above only see a string in the place it is displayed — `goNote` in the path
 * widget is four sentences assembled in a variable and handed on as a prop,
 * and rule 8 is about that string just as much as about a label.
 */
const isProse = (text) => text.trim().split(/\s+/).filter((token) => WORD.test(token)).length >= 2;

/** Is this node somewhere inside a `className`, where a list of words is expected? */
const inClassName = (node) => {
  for (let current = node; current; current = current.parent) {
    if (current.type === 'JSXAttribute' && CLASS_ATTRIBUTES.has(current.name?.name)) {
      return true;
    }
  }
  return false;
};

/**
 * HTML entities are one glyph each, whatever they are spelled with.
 *
 * `&minus;` is a minus sign and `&laquo;` is a chevron on a stepper key —
 * neither is six letters of English, and testing the source text without
 * this reads them as both.
 */
const withoutEntities = (text) => text.replace(/&[#\w]+;/g, '');

/**
 * Is this a word, or is it punctuation?
 *
 * The line is a letter. `·`, `«` and `—` are glyphs that mean the same thing
 * in every language the panel will ever be in, and a key for each of them
 * would be ceremony with no translation behind it. Anything with a letter in
 * it is a word somebody wrote, including units and abbreviations — rule 8
 * names "mm/min" and "IZO" explicitly, and both have letters.
 */
const isWords = (text) => /\p{L}/u.test(withoutEntities(text));

/** The literal parts of a template, i.e. everything that is not `${}`. */
const templateText = (node) => node.quasis.map((q) => q.value.cooked ?? '').join('');

/**
 * The string this node displays, or null if it does not display one.
 *
 * `{'text'}` and `` {`text ${value}`} `` are both ways of writing a literal
 * into JSX that a check for quoted attributes alone would walk straight past.
 * So is an array: rule 8 names option arrays, and the shortcut sheet hands
 * its key caps down as `keys={['Shift', '+ direction']}`.
 */
const literalText = (node) => {
  if (!node) {
    return null;
  }
  if (node.type === 'Literal') {
    return typeof node.value === 'string' ? node.value : null;
  }
  if (node.type === 'TemplateLiteral') {
    return templateText(node);
  }
  if (node.type === 'ArrayExpression') {
    const parts = node.elements.map(literalText).filter((part) => part !== null);
    return parts.length > 0 ? parts.join(' ') : null;
  }
  // `connected ? null : 'No connection to the controller'` is how the top bar
  // wrote its one warning, and a check for quoted attributes walks past it
  // because the attribute holds a conditional. Same for the `||` that supplies
  // a fallback name. Either branch being a string is enough.
  if (node.type === 'ConditionalExpression') {
    return literalText(node.consequent) ?? literalText(node.alternate);
  }
  if (node.type === 'LogicalExpression') {
    return literalText(node.left) ?? literalText(node.right);
  }
  // `({ label = 'Tool and spindle' }) => …`. Half the widgets name themselves
  // with a default parameter, which is a displayed string written in the
  // signature rather than in the JSX.
  if (node.type === 'AssignmentPattern') {
    return literalText(node.right);
  }
  if (node.type === 'JSXExpressionContainer') {
    return literalText(node.expression);
  }
  return null;
};

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Displayed strings come from a translation key, not from the source.',
    },
    schema: [],
    messages: {
      text: 'Displayed text needs a translation key: {t(\'…\')} with the words in src/panel/i18n.',
      attribute: '`{{name}}` is read by the operator, so it needs a translation key: {t(\'…\')}.',
      property: '`{{name}}` holds a displayed string. Put the key here and translate it where it is rendered.',
      prose: 'A sentence in the source: "{{text}}". Displayed or not, it belongs in src/panel/i18n.',
    },
  },

  create(context) {
    return {
      JSXText(node) {
        if (isWords(node.value)) {
          context.report({ node, messageId: 'text' });
        }
      },

      JSXExpressionContainer(node) {
        // Only as a child. As an attribute value it is reached below, where
        // the attribute's name decides whether it is displayed at all.
        if (node.parent?.type !== 'JSXElement' && node.parent?.type !== 'JSXFragment') {
          return;
        }
        const text = literalText(node.expression);
        if (text !== null && isWords(text)) {
          context.report({ node, messageId: 'text' });
        }
      },

      JSXAttribute(node) {
        const name = node.name.type === 'JSXNamespacedName'
          ? `${node.name.namespace.name}:${node.name.name.name}`
          : node.name.name;

        if (NOT_DISPLAYED.has(name) || name.startsWith('data-') || name.startsWith('on')) {
          return;
        }

        const text = literalText(node.value);
        if (text !== null && isWords(text)) {
          context.report({ node, messageId: 'attribute', data: { name } });
        }
      },

      // The catch-all, and the only check here that is a guess rather than a
      // reading of where the string sits. It is what covers a sentence built
      // in a variable three functions away from the element that shows it.
      Literal(node) {
        if (typeof node.value === 'string' && isProse(node.value) && !inClassName(node)) {
          context.report({ node, messageId: 'prose', data: { text: node.value.slice(0, 40) } });
        }
      },

      TemplateLiteral(node) {
        const text = templateText(node);
        if (isProse(text) && !inClassName(node)) {
          context.report({ node, messageId: 'prose', data: { text: text.slice(0, 40) } });
        }
      },

      Property(node) {
        const name = node.key.type === 'Identifier' ? node.key.name : node.key.value;
        if (!DISPLAY_PROPERTIES.has(name)) {
          return;
        }
        const text = literalText(node.value);
        if (text !== null && isWords(text)) {
          context.report({ node, messageId: 'property', data: { name } });
        }
      },
    };
  },
};
