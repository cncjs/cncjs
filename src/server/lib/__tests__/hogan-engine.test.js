import fs from 'fs';
import os from 'os';
import path from 'path';
import hoganEngine from '../hogan-engine';

/** Write a template to a scratch file and hand back its path. */
const writeTemplate = (name, contents) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hogan-engine-'));
  const filePath = path.join(dir, name);

  fs.writeFileSync(filePath, contents, 'utf8');

  return filePath;
};

/** Render through the engine and resolve the way Express consumes it. */
const render = (filePath, options) => new Promise((resolve, reject) => {
  hoganEngine(filePath, options, (err, html) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(html);
  });
});

describe('hoganEngine', () => {
  it('interpolates the options object into the template', async () => {
    const filePath = writeTemplate('index.hbs', '<title>{{title}}</title>');

    await expect(render(filePath, { title: 'cncjs 1.11.5' }))
      .resolves.toBe('<title>cncjs 1.11.5</title>');
  });

  it('reaches into nested values, as the 500 view does for error.message', async () => {
    const filePath = writeTemplate('500.hogan', '<h1>Error: {{error.message}}</h1>');

    await expect(render(filePath, { error: { message: 'Internal server error' } }))
      .resolves.toBe('<h1>Error: Internal server error</h1>');
  });

  it('escapes HTML in interpolated values', async () => {
    const filePath = writeTemplate('index.hbs', '<title>{{title}}</title>');

    await expect(render(filePath, { title: '<script>alert(1)</script>' }))
      .resolves.toBe('<title>&lt;script&gt;alert(1)&lt;/script&gt;</title>');
  });

  it('leaves a missing value empty rather than throwing', async () => {
    const filePath = writeTemplate('404.hogan', '<html lang="{{lang}}">{{missing}}</html>');

    await expect(render(filePath, {})).resolves.toBe('<html lang=""></html>');
  });

  it('strips a UTF-8 BOM so it cannot reach the rendered page', async () => {
    const filePath = writeTemplate('bom.hogan', String.fromCharCode(0xFEFF) + '<!DOCTYPE html>');

    const html = await render(filePath, {});

    expect(html).toBe('<!DOCTYPE html>');
    expect(html.charCodeAt(0)).not.toBe(0xFEFF);
  });

  it('reports a missing template through the callback', async () => {
    const missing = path.join(os.tmpdir(), 'hogan-engine-does-not-exist', 'nope.hogan');

    await expect(render(missing, {})).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('re-reads the file when caching is off', async () => {
    const filePath = writeTemplate('index.hbs', 'first');

    await expect(render(filePath, { cache: false })).resolves.toBe('first');

    fs.writeFileSync(filePath, 'second', 'utf8');

    await expect(render(filePath, { cache: false })).resolves.toBe('second');
  });

  it('serves the compiled template from cache when caching is on', async () => {
    const filePath = writeTemplate('cached.hbs', 'first {{name}}');

    await expect(render(filePath, { cache: true, name: 'a' })).resolves.toBe('first a');

    fs.writeFileSync(filePath, 'second {{name}}', 'utf8');

    // Express enables 'view cache' in production, where a template changing on
    // disk is not something the server is expected to notice.
    await expect(render(filePath, { cache: true, name: 'b' })).resolves.toBe('first b');
  });
});
