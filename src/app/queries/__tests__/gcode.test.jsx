import { act, renderHook, waitFor } from '@testing-library/react';
import api from '@app/api';
import { createTestQueryClient, createTestWrapper } from '@app/test/render';

jest.mock('@app/api', () => ({
  __esModule: true,
  default: {
    loadGCode: jest.fn(),
  },
}));

const { useLoadGCodeMutation } = require('../gcode');

const renderWithClient = (callback, client = createTestQueryClient()) => {
  const view = renderHook(callback, {
    wrapper: createTestWrapper(client),
  });
  return { client, view };
};

describe('G-code query boundary', () => {
  beforeEach(() => {
    api.loadGCode.mockReset();
  });

  test('loads G-code metadata with the controller context', async () => {
    const response = { name: 'part.gcode', gcode: 'G1 X1' };
    const meta = { name: 'part.gcode', gcode: 'G1 X1' };
    const context = { xmin: 0, xmax: 10 };
    api.loadGCode.mockResolvedValue({ body: response });
    const { client, view } = renderWithClient(() => useLoadGCodeMutation());

    try {
      let result;
      await act(async () => {
        result = await view.result.current.mutateAsync({ meta, context });
      });
      expect(result).toEqual(response);
      expect(api.loadGCode).toHaveBeenCalledTimes(1);
      expect(api.loadGCode).toHaveBeenCalledWith(meta, context);
    } finally {
      view.unmount();
      client.clear();
    }
  });

  test('does not retry a failed load mutation', async () => {
    const error = new Error('load failed');
    api.loadGCode.mockRejectedValue(error);
    const { client, view } = renderWithClient(() => useLoadGCodeMutation());

    try {
      await act(async () => {
        await expect(view.result.current.mutateAsync({
          meta: { name: 'part.gcode', gcode: 'G1 X1' },
          context: { xmin: 0 },
        })).rejects.toThrow('load failed');
      });
      await waitFor(() => expect(view.result.current.isError).toBe(true));
      expect(api.loadGCode).toHaveBeenCalledTimes(1);
    } finally {
      view.unmount();
      client.clear();
    }
  });
});
