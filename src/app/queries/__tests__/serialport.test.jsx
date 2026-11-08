import { renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient, createTestWrapper } from '@app/test/render';

const mockController = {
  getPorts: jest.fn(),
  getBaudRates: jest.fn(),
};

jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: mockController,
}));

const {
  SERIALPORT_BAUD_RATES_QUERY_KEY,
  SERIALPORT_PORTS_QUERY_KEY,
  useSerialBaudRatesQuery,
  useSerialPortsQuery,
} = require('../serialport');

const renderWithClient = (callback, client = createTestQueryClient()) => {
  const view = renderHook(callback, {
    wrapper: createTestWrapper(client),
  });
  return { client, view };
};

describe('serial-port queries', () => {
  beforeEach(() => {
    mockController.getPorts.mockReset();
    mockController.getBaudRates.mockReset();
  });

  test('reads ports and baud rates through TanStack Query', async () => {
    const ports = [{ path: '/dev/ttyUSB0', connected: false }];
    const baudRates = [115200, 250000];
    mockController.getPorts.mockImplementation(callback => callback(null, ports));
    mockController.getBaudRates.mockImplementation(callback => callback(null, baudRates));
    const { client, view } = renderWithClient(() => ({
      ports: useSerialPortsQuery(),
      baudRates: useSerialBaudRatesQuery(),
    }));

    try {
      await waitFor(() => {
        expect(view.result.current.ports.isSuccess).toBe(true);
        expect(view.result.current.baudRates.isSuccess).toBe(true);
      });
      expect(view.result.current.ports.data).toEqual(ports);
      expect(view.result.current.baudRates.data).toEqual(baudRates);
      expect(client.getQueryData(SERIALPORT_PORTS_QUERY_KEY)).toEqual(ports);
      expect(client.getQueryData(SERIALPORT_BAUD_RATES_QUERY_KEY)).toEqual(baudRates);
    } finally {
      view.unmount();
      client.clear();
    }
  });

  test('surfaces the legacy controller callback error without retrying', async () => {
    const error = new Error('Socket is not connected');
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockController.getPorts.mockImplementation(callback => callback(error));
    const { client, view } = renderWithClient(() => useSerialPortsQuery());

    try {
      await waitFor(() => expect(view.result.current.isError).toBe(true));
      expect(view.result.current.error).toBe(error);
      expect(mockController.getPorts).toHaveBeenCalledTimes(1);
    } finally {
      view.unmount();
      client.clear();
      consoleError.mockRestore();
    }
  });
});
