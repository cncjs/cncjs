/* eslint-env jest */
import { once } from 'events';
import http from 'http';
import jwt from 'jsonwebtoken';
import { SerialPort } from 'serialport';
import socketIOClient from 'socket.io-client';
import serviceEngine from '../service-engine';
import serviceContainer from '../service-container';
import controllers from '../store/controllers';

jest.mock('serialport', () => ({ SerialPort: { list: jest.fn() } }));
jest.mock('../config/settings', () => ({ secret: 'port-list-test-secret' }));
jest.mock('../lib/access-control', () => ({ isAllowedIPAddress: () => true }));
jest.mock('../lib/logger', () => () => ({ debug: jest.fn(), warn: jest.fn(), error: jest.fn() }));
jest.mock('../controllers/Grbl/GrblController', () => jest.fn());
jest.mock('../controllers/Marlin/MarlinController', () => jest.fn());
jest.mock('../controllers/Smoothie/SmoothieController', () => jest.fn());
jest.mock('../controllers/TinyG/TinyGController', () => jest.fn());
jest.mock('../service-container', () => {
  const { EventEmitter } = require('events');
  const services = {
    userStore: Object.assign(new EventEmitter(), { get: jest.fn() }),
    shellCommand: new EventEmitter(),
    directoryWatcher: new EventEmitter(),
  };
  return { resolve: name => services[name] };
});

const userStore = serviceContainer.resolve('userStore');
const getPorts = socket => new Promise(resolve => {
  socket.emit('getPorts', (...args) => resolve(args));
});

let server;
let socket;
let configuredPorts;

beforeAll(async () => {
  server = http.createServer();
  serviceEngine.start(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  socket = socketIOClient(`http://127.0.0.1:${server.address().port}`, {
    query: { token: jwt.sign({}, 'port-list-test-secret') },
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
  });
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
});

beforeEach(() => {
  configuredPorts = [];
  SerialPort.list.mockResolvedValue([]);
  userStore.get.mockImplementation((key, fallback) => (key === 'ports' ? configuredPorts : fallback));
  Object.keys(controllers).forEach(ident => delete controllers[ident]);
});

afterAll(async () => {
  socket?.close();
  const closed = once(server, 'close');
  serviceEngine.stop();
  await closed;
  Object.keys(controllers).forEach(ident => delete controllers[ident]);
});

test('merges exact paths in first-seen order with configured metadata taking precedence', async () => {
  const detectedPorts = [
    { path: '/dev/a', manufacturer: 'first detection' },
    { path: '/dev/b', manufacturer: 'detected b' },
    { path: '/dev/a', manufacturer: 'last detection' },
    { path: '/dev/c', manufacturer: 'detected c' },
  ];
  configuredPorts = [
    { path: '/dev/b', manufacturer: 'configured b' },
    { path: '/dev/d', manufacturer: 'first configuration' },
    { path: '/dev/c' },
    { path: '/dev/d', manufacturer: 'last configuration' },
  ];
  SerialPort.list.mockResolvedValue(detectedPorts);

  expect(await getPorts(socket)).toEqual([null, [
    { path: '/dev/a', manufacturer: 'last detection', connected: false },
    { path: '/dev/b', manufacturer: 'configured b', connected: false },
    { path: '/dev/c', manufacturer: 'detected c', connected: false },
    { path: '/dev/d', manufacturer: 'last configuration', connected: false },
  ]]);
  expect(detectedPorts[1].manufacturer).toBe('detected b');
  expect(configuredPorts[2]).toEqual({ path: '/dev/c' });
});

test('preserves explicit metadata clearing and filters entries without paths', async () => {
  SerialPort.list.mockResolvedValue([{ path: '/dev/a', manufacturer: 'detected' }, {}]);
  configuredPorts = [{ path: '' }, { path: '/dev/a', manufacturer: null }, { path: '/dev/custom' }];

  expect(await getPorts(socket)).toEqual([null, [
    { path: '/dev/a', manufacturer: null, connected: false },
    { path: '/dev/custom', connected: false },
  ]]);
});

test('retains distinct aliases and serial connection status without including socket connections', async () => {
  SerialPort.list.mockResolvedValue([{ path: '/dev/tty.test' }, { path: '/dev/cu.test' }]);
  configuredPorts = [{ path: '/dev/tty.test' }];
  controllers.serial = {
    connection: { type: 'serial', options: { path: '/dev/tty.test' } },
    removeSocket: jest.fn(),
  };
  controllers.network = {
    connection: { type: 'socket', options: { path: '/dev/cu.test' } },
    removeSocket: jest.fn(),
  };

  expect(await getPorts(socket)).toEqual([null, [
    { path: '/dev/tty.test', connected: true },
    { path: '/dev/cu.test', connected: false },
  ]]);
});

test('returns an empty port list through the existing acknowledgement', async () => {
  expect(await getPorts(socket)).toEqual([null, []]);
});

test('returns serial enumeration failures through the error acknowledgement', async () => {
  SerialPort.list.mockRejectedValue(new Error('enumeration failed'));

  const [error, ports] = await getPorts(socket);
  expect(error).toBeTruthy();
  expect(ports).toBeUndefined();
});
