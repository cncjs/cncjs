const { test, expect } = require('./fixtures');

/**
 * The G-code download is a form POST with `enctype="multipart/form-data"`
 * carrying two text fields and no file, so the server needs a multipart parser
 * purely to reach `req.body.port` and `req.body.token`. Nothing else in the
 * app posts multipart, and no endpoint reads `req.files`.
 *
 * That makes the two cases below the whole contract: text fields must parse,
 * and a file must never be accepted. Neither is visible to `yarn jest`, which
 * never builds the Express app.
 */
test.describe('multipart requests', () => {
  const DOWNLOAD = 'api/gcode/download';

  test('parses the text fields the G-code download form posts', async ({ request }) => {
    const res = await request.post(DOWNLOAD, {
      multipart: { port: 'NO_SUCH_PORT' },
    });

    // 'Controller not found' means `port` arrived. An unparsed body would have
    // failed earlier and differently, with 'No port specified'.
    expect(res.status()).toBe(400);
    expect(await res.text()).toContain('Controller not found');
  });

  test('refuses a file instead of writing it anywhere', async ({ request }) => {
    const res = await request.post(DOWNLOAD, {
      multipart: {
        port: 'NO_SUCH_PORT',
        payload: {
          name: '../../evil.sh',
          mimeType: 'application/x-sh',
          buffer: Buffer.from('#!/bin/sh\necho pwned\n'),
        },
      },
    });

    expect(res.ok()).toBe(false);
    expect(await res.text()).not.toContain('Controller not found');
  });
});
