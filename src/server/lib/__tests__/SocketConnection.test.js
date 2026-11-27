/* eslint-env jest */
import net from 'net';
import SocketConnection from '../SocketConnection';

const listenEphemeral = (server) => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => resolve(server.address().port));
});

describe('SocketConnection', () => {
  describe('open', () => {
    test('should invoke the callback without error when the connection is established', async () => {
      const server = net.createServer(() => {});
      const accepted = new Promise((resolve) => {
        server.once('connection', resolve);
      });
      const port = await listenEphemeral(server);

      try {
        const connection = new SocketConnection({ host: '127.0.0.1', port });
        connection.on('error', () => {});
        const err = await new Promise((resolve, reject) => {
          try {
            connection.open(resolve);
          } catch (err) {
            reject(err);
          }
        });

        expect(err).toBe(null);

        // Finish accepting before stopping the listener; macOS can otherwise
        // reset the client after close() has removed its error listener.
        await accepted;
        const closed = new Promise((resolve) => {
          connection.socket.once('close', resolve);
        });
        connection.close();
        await closed;
      } finally {
        await new Promise((resolve) => {
          server.close(resolve);
        });
      }
    });

    test('should invoke the callback with an error when the connection is refused', async () => {
      // Allocate an ephemeral port with no listener, so connecting to it is refused
      const server = net.createServer(() => {});
      const port = await listenEphemeral(server);
      await new Promise((resolve) => {
        server.close(resolve);
      });

      const connection = new SocketConnection({ host: '127.0.0.1', port });
      connection.on('error', () => {});
      const closed = new Promise((resolve) => {
        connection.once('close', resolve);
      });
      const err = await new Promise((resolve, reject) => {
        try {
          connection.open(resolve);
        } catch (err) {
          reject(err);
        }
      });

      expect(err).toBeTruthy();
      expect(err.code).toBe('ECONNREFUSED');
      await closed;
    });
  });
});
