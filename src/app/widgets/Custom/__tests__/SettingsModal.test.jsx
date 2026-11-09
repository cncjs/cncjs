import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAppUI } from '@app/test/render';

const configValues = {
  title: 'Existing title',
  url: '/widget/',
};
const mockConfigGet = jest.fn(path => configValues[path]);
const mockConfigSet = jest.fn((path, value) => {
  configValues[path] = value;
});

jest.mock('@app/widgets/shared/useWidgetConfig', () => ({
  __esModule: true,
  default: () => ({
    get: mockConfigGet,
    set: mockConfigSet,
  }),
}));

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: {
    _: value => value,
  },
}));

const SettingsModal = require('../modals/SettingsModal').default;

function NestedSettingsHarness({ events, triggerRef }) {
  const [outerOpen, setOuterOpen] = React.useState(false);
  const [innerOpen, setInnerOpen] = React.useState(false);

  React.useEffect(() => {
    triggerRef.current.focus();
    setOuterOpen(true);
    setInnerOpen(true);
  }, [triggerRef]);

  return (
    <>
      <button ref={triggerRef} type="button">Open settings</button>
      {outerOpen && (
        <SettingsModal
          onClose={() => {
            events.push('outer');
            setOuterOpen(false);
          }}
        />
      )}
      {innerOpen && (
        <SettingsModal
          onClose={() => {
            events.push('inner');
            setInnerOpen(false);
          }}
        />
      )}
    </>
  );
}

describe('Custom SettingsModal Tonic contract', () => {
  beforeEach(() => {
    configValues.title = 'Existing title';
    configValues.url = '/widget/';
    mockConfigGet.mockClear();
    mockConfigSet.mockClear();
  });

  test('submits the draft and closes only after config writes succeed', async () => {
    const onClose = jest.fn();

    renderAppUI(<SettingsModal onClose={onClose} />);

    fireEvent.change(screen.getByDisplayValue('Existing title'), {
      target: { value: 'Updated title' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));

    expect(mockConfigSet).toHaveBeenNthCalledWith(1, 'title', 'Updated title');
    expect(mockConfigSet).toHaveBeenNthCalledWith(2, 'url', '/widget/');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('submits the draft from the keyboard alone', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    renderAppUI(<SettingsModal onClose={onClose} />);

    const title = screen.getByDisplayValue('Existing title');
    title.focus();
    await user.clear(title);
    await user.keyboard('Keyboard title');

    const save = screen.getByRole('button', { name: 'Save Changes' });
    save.focus();
    await user.keyboard('{Enter}');

    expect(mockConfigSet).toHaveBeenNthCalledWith(1, 'title', 'Keyboard title');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('keeps the draft open when a config write fails', async () => {
    const onClose = jest.fn();
    mockConfigSet.mockImplementationOnce(() => {
      throw new Error('save failed');
    });

    renderAppUI(<SettingsModal onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(await screen.findByText('save failed')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Existing title')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  test('cancels without writing config', () => {
    const onClose = jest.fn();

    renderAppUI(<SettingsModal onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockConfigSet).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('does not close on overlay click, but closes on Escape', async () => {
    const onClose = jest.fn();

    renderAppUI(<SettingsModal onClose={onClose} />);
    fireEvent.click(screen.getByTestId('settings-modal-overlay'));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  test('restores focus to the trigger after closing', async () => {
    let view;
    const onClose = jest.fn(() => view.unmount());
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.textContent = 'Open settings';
    document.body.appendChild(trigger);
    trigger.focus();

    try {
      view = renderAppUI(<SettingsModal onClose={onClose} />);
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(document.activeElement).toBe(trigger);
      });
    } finally {
      trigger.remove();
    }
  });

  test('closes nested dialogs from the top and restores focus in order', async () => {
    const events = [];
    const triggerRef = React.createRef();
    const view = renderAppUI(
      <NestedSettingsHarness events={events} triggerRef={triggerRef} />
    );

    try {
      let dialogs;
      await waitFor(() => {
        dialogs = screen.getAllByRole('dialog');
        expect(dialogs).toHaveLength(2);
      });
      fireEvent.keyDown(dialogs[dialogs.length - 1], { key: 'Escape' });

      await waitFor(() => {
        expect(events).toEqual(['inner']);
        expect(screen.getAllByRole('dialog')).toHaveLength(1);
      });

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      await waitFor(() => {
        expect(events).toEqual(['inner', 'outer']);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(document.activeElement).toBe(triggerRef.current);
    } finally {
      view.unmount();
    }
  });
});
