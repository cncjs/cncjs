import { act, render } from '@testing-library/react';
import React from 'react';
import { createTestQueryClient, createTestWrapper } from '@app/test/render';
import controller from '@app/lib/controller';
import MacroQueryEvents from '../MacroQueryEvents';

jest.mock('@app/api/axios', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
}));

describe('MacroQueryEvents', () => {
  beforeEach(() => {
    controller.addListener.mockReset();
    controller.removeListener.mockReset();
  });

  test('mounts one config listener and invalidates read data only', async () => {
    const client = createTestQueryClient();
    client.invalidateQueries = jest.fn(() => Promise.resolve());
    const view = render(<MacroQueryEvents />, {
      wrapper: createTestWrapper(client),
    });

    expect(controller.addListener).toHaveBeenCalledTimes(1);
    expect(controller.addListener).toHaveBeenCalledWith('config:change', expect.any(Function));
    const onConfigChange = controller.addListener.mock.calls[0][1];

    await act(async () => {
      await onConfigChange();
    });
    expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['api/macros'] });

    view.unmount();
    expect(controller.removeListener).toHaveBeenCalledWith('config:change', onConfigChange);
    client.clear();
  });
});
