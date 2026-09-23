const { test, expect, TEST_PORT } = require('./fixtures');

test.skip(!TEST_PORT, 'set CNCJS_TEST_PORT to run the hardware tier');

/**
 * Leave the machine as this tier found it: with nothing connected.
 *
 * The server keeps a serial port open after every client has gone —
 * `CNCEngine` drops the socket from the controller and leaves the controller
 * itself running — so a hardware run that simply ends leaves the port open
 * indefinitely. The next tier then runs against a connected machine without
 * knowing it, and every spec whose premise is "nothing is plugged in" is
 * asserting something that is no longer true.
 *
 * It does not fail loudly, either. The old application cannot *see* a port
 * that was opened before it loaded — its Connection widget still offers
 * "Open" — so its disconnected specs keep passing by accident. The panel asks
 * the server on startup and does not have that blindness, which is how this
 * came to light at all.
 *
 * A project teardown rather than an `afterAll`: this has to run once after the
 * whole tier, not once per file.
 */
test('closes the port the tier opened', async ({ grbl }) => {
  // Not `requireIdle`: this closes the port, and a machine sulking in alarm
  // behind it is not a reason to leave it open. See the fixture.
  await grbl.connect({ requireIdle: false });

  // "Connect automatically" comes first, and without it none of the rest
  // works. It is on by default, and the server log tells the whole story:
  // `socket.close("COM3")`, two `socket.list()`, and then `socket.open("COM3")`
  // 100ms later — the widget reopens the port the instant it closes. Closing
  // and then checking looks like a server that ignores the request, which is
  // what it looked like for some time.
  const autoConnect = grbl.connection.getByLabel(/connect automatically/i);
  if (await autoConnect.isChecked()) {
    await autoConnect.uncheck();
  }

  // Closed, then *confirmed closed against the server*. The widget's button
  // flipping back to "Open" is this client's opinion; `/api/controllers` is
  // the server's, and the server is the one holding the serial port.
  await grbl.connection.getByRole('button', { name: /^Close$/ }).click();

  await expect
    .poll(
      async () => (await grbl.readControllerState()) === null,
      { message: `${TEST_PORT} should be closed when the tier ends`, timeout: 30000 }
    )
    .toBe(true);
});
