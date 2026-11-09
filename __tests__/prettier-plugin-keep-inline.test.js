const path = require('path');
const prettier = require('prettier');
const plugin = require('../prettier-plugin-keep-inline.js');

const PLUGIN_PATH = path.join(__dirname, '..', 'prettier-plugin-keep-inline.js');

// A single argument longer than printWidth, so Prettier must otherwise wrap.
const LONG = 'X'.repeat(200);

function format(source, options) {
  return prettier.format(source, {
    parser: 'babel',
    plugins: [plugin],
    printWidth: 150,
    singleQuote: true,
    ...options,
  });
}

function isSingleLine(output) {
  return output.trim().split('\n').length === 1;
}

describe('keep-inline plugin', () => {
  describe('activation', () => {
    it('is inert with no configuration', async () => {
      const out = await format(`i18n._('${LONG}');\n`);
      expect(isSingleLine(out)).toBe(false);
    });

    it('is inert when a target list is empty', async () => {
      const out = await format(`i18n._('${LONG}');\n`, {
        keepInlineCalls: [],
        keepInlineJSXElements: [],
      });
      expect(isSingleLine(out)).toBe(false);
    });

    it('wraps the same node once configured', async () => {
      const out = await format(`i18n._('${LONG}');\n`, {
        keepInlineCalls: ['i18n._'],
      });
      expect(isSingleLine(out)).toBe(true);
    });
  });

  describe('call matching', () => {
    const calls = {
      'i18n._': `i18n._('${LONG}');`,
      'i18n.t': `i18n.t('${LONG}');`,
      'i18n.a.b': `i18n.a.b('${LONG}');`,
      'log.debug': `log.debug('${LONG}');`,
      other: `other('${LONG}');`,
    };

    // [pattern, kept calls, wrapped calls]
    const cases = [
      ['exact name', 'i18n._', ['i18n._'], ['i18n.t', 'i18n.a.b', 'log.debug', 'other']],
      ['* stays in one name part', 'i18n.*', ['i18n._', 'i18n.t'], ['i18n.a.b', 'log.debug', 'other']],
      ['** spans name parts', 'i18n.**', ['i18n._', 'i18n.t', 'i18n.a.b'], ['log.debug', 'other']],
      ['leading wildcard', '*.debug', ['log.debug'], ['i18n._', 'i18n.t', 'i18n.a.b', 'other']],
      ['match everything', '**', ['i18n._', 'i18n.t', 'i18n.a.b', 'log.debug', 'other'], []],
      ['exact non-match', 'nomatch', [], ['i18n._', 'i18n.t', 'i18n.a.b', 'log.debug', 'other']],
    ];

    describe.each(cases)('%s', (_name, pattern) => {
      it.each(Object.keys(calls))('%s against pattern ' + pattern, async (callee) => {
        const out = await format(calls[callee], { keepInlineCalls: [pattern] });
        // Every call must be classified: kept means one line, otherwise wrapped.
        const expected = cases.find((c) => c[1] === pattern);
        const shouldKeep = expected[2].includes(callee);
        expect(isSingleLine(out)).toBe(shouldKeep);
      });
    });

    it('preserves the original text of a frozen call', async () => {
      const out = await format(`i18n._('${LONG}');\n`, { keepInlineCalls: ['i18n._'] });
      expect(out).toContain(`i18n._('${LONG}')`);
    });

    it('accepts several patterns at once', async () => {
      const out = await format(`wrapper(i18n._('${LONG}'));\n`, {
        keepInlineCalls: ['nonexistent', 'i18n._'],
      });
      expect(out).toContain(`i18n._('${LONG}')`);
    });

    it('requires an array — a bare string is rejected', () => {
      // Prettier 2.x formats synchronously, so a bad option throws.
      expect(() => format(`i18n._('${LONG}');\n`, { keepInlineCalls: 'i18n._' })).toThrow(
        /Expected an array/,
      );
      expect(() =>
        format(`i18n._('${LONG}');\n`, { keepInlineJSXElements: 'I18n' }),
      ).toThrow(/Expected an array/);
    });

    it('does not match a different object with the same property', async () => {
      const out = await format(`other._('${LONG}');\n`, { keepInlineCalls: ['i18n._'] });
      expect(isSingleLine(out)).toBe(false);
    });

    it('does not descend into a frozen call to freeze nested calls', async () => {
      const out = await format(`i18n._(translate('${LONG}'));\n`, {
        keepInlineCalls: ['i18n._'],
      });
      expect(isSingleLine(out)).toBe(true);
    });
  });

  describe('JSX element matching', () => {
    const element = (name, length = 200) =>
      `<${name}>{'${'X'.repeat(length)}'}</${name}>;\n`;

    it('keeps a configured element on one line', async () => {
      const out = await format(element('I18n'), { keepInlineJSXElements: ['I18n'] });
      expect(isSingleLine(out)).toBe(true);
    });

    it('does not keep an unconfigured element', async () => {
      const out = await format(element('I18n'), { keepInlineJSXElements: ['Trans'] });
      expect(isSingleLine(out)).toBe(false);
    });

    it('supports a wildcard element name', async () => {
      const kept = await format(element('FormattedMessage'), {
        keepInlineJSXElements: ['*Message'],
      });
      const wrapped = await format(element('I18n'), { keepInlineJSXElements: ['*Message'] });
      expect(isSingleLine(kept)).toBe(true);
      expect(isSingleLine(wrapped)).toBe(false);
    });

    it('leaves an element already spanning several lines untouched', async () => {
      const source = `<I18n>\n  {'${LONG}'}\n</I18n>;\n`;
      const out = await format(source, { keepInlineJSXElements: ['I18n'] });
      // Multi-line source is never frozen, so the element stays multi-line.
      expect(isSingleLine(out)).toBe(false);
      expect(out).toContain('\n');
    });

    it('collapses a multi-line element once it fits', async () => {
      const source = `<I18n>\n  {'short'}\n</I18n>;\n`;
      const out = await format(source, { keepInlineJSXElements: ['I18n'] });
      expect(isSingleLine(out)).toBe(true);
    });

    it('keeps calls and elements working together', async () => {
      const source = `<I18n>{i18n._('${LONG}')}</I18n>;\n`;
      const out = await format(source, {
        keepInlineCalls: ['i18n._'],
        keepInlineJSXElements: ['I18n'],
      });
      expect(isSingleLine(out)).toBe(true);
    });
  });

  describe('single-line guard', () => {
    it('leaves a multi-line call to Prettier so it can collapse', async () => {
      const source = `i18n._(\n  '${'X'.repeat(20)}',\n);\n`;
      const out = await format(source, { keepInlineCalls: ['i18n._'] });
      // Short enough to fit once collapsed — the guard must not freeze the
      // original multi-line form.
      expect(isSingleLine(out)).toBe(true);
    });

    it('does not freeze a multi-line call that stays too long', async () => {
      const source = `i18n._(\n  '${LONG}',\n);\n`;
      const out = await format(source, { keepInlineCalls: ['i18n._'] });
      expect(isSingleLine(out)).toBe(false);
    });
  });

  describe('idempotency', () => {
    const samples = [
      `i18n._('${LONG}');\n`,
      `const el = <I18n>{'${LONG}'}</I18n>;\n`,
      `<Button title={i18n._('${LONG}')} />;\n`,
      `log.debug('${LONG}');\n`,
    ];

    it.each(samples)('formatting twice equals formatting once: %#', async (source) => {
      const options = {
        keepInlineCalls: ['i18n._', 'log.debug'],
        keepInlineJSXElements: ['I18n'],
      };
      const once = await format(source, options);
      const twice = await format(once, options);
      expect(twice).toBe(once);
    });
  });

  describe('option surface', () => {
    it('declares both options as arrays with empty defaults', () => {
      const options = plugin.options;
      expect(Object.keys(options).sort()).toEqual([
        'keepInlineCalls',
        'keepInlineJSXElements',
      ]);
      for (const option of Object.values(options)) {
        expect(option.array).toBe(true);
        expect(option.category).toBe('Keep Inline');
        expect(option.default).toEqual([{ value: [] }]);
      }
    });

    it('exposes glob support in the option descriptions', () => {
      expect(plugin.options.keepInlineCalls.description).toMatch(/\*/);
      expect(plugin.options.keepInlineJSXElements.description).toMatch(/\*/);
    });

    it('reports both options through Prettier support info', () => {
      const names = prettier
        .getSupportInfo({ plugins: [PLUGIN_PATH] })
        .options.filter((option) => option.name.startsWith('keepInline'))
        .map((option) => option.name)
        .sort();
      expect(names).toEqual(['keepInlineCalls', 'keepInlineJSXElements']);
    });
  });
});