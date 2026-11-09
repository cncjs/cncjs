import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderAppUI } from '@app/test/render';

const mockCommand = jest.fn();
const mockWrite = jest.fn();
const mockWriteln = jest.fn();
const mockStore = {
  connection: { state: 'connected' },
  controller: {
    settings: { '$0': 10 },
    state: {
      status: { ov: [100, 100, 100] },
    },
    type: 'Grbl',
  },
};

jest.mock('react-redux', () => ({
  connect: mapStateToProps => Component => props => (
    <Component {...mapStateToProps(mockStore)} {...props} />
  ),
}));

jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: {
    command: mockCommand,
    write: mockWrite,
    writeln: mockWriteln,
  },
}));

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: value => value },
}));

jest.mock('@app/widgets/shared/WidgetConfigProvider', () => ({
  __esModule: true,
  default: ({ children }) => children,
}));

jest.mock('@app/widgets/shared/useWidgetConfig', () => ({
  __esModule: true,
  default: () => ({ get: () => true, set: jest.fn() }),
}));

const FeedOverride = require('../FeedOverride').default;
const RapidOverride = require('../RapidOverride').default;
const SpindleOverride = require('../SpindleOverride').default;
const ControllerModal = require('../modals/ControllerModal').default;
const ReportSection = require('../components/ReportSection').default;
const GrblWidget = require('../index').default;

function pressRepeatable(element) {
  const button = element.closest('button');
  fireEvent.mouseDown(button);
  fireEvent.mouseUp(button);
}

describe('Grbl command contract', () => {
  beforeEach(() => {
    mockCommand.mockClear();
    mockWrite.mockClear();
    mockWriteln.mockClear();
    mockStore.connection.state = 'connected';
    mockStore.controller.state.status.ov = [100, 100, 100];
    mockStore.controller.type = 'Grbl';
  });

  test('sends the exact feed, spindle, and rapid override values', () => {
    renderAppUI(
      <>
        <FeedOverride />
        <SpindleOverride />
        <RapidOverride />
      </>
    );

    pressRepeatable(screen.getAllByText('-10%')[0]);
    pressRepeatable(screen.getAllByText('-1%')[0]);
    pressRepeatable(screen.getAllByText('1%')[0]);
    pressRepeatable(screen.getAllByText('10%')[0]);
    fireEvent.click(screen.getByLabelText('Reset feed rate override'));
    pressRepeatable(screen.getAllByText('-10%')[1]);
    pressRepeatable(screen.getAllByText('-1%')[1]);
    pressRepeatable(screen.getAllByText('1%')[1]);
    pressRepeatable(screen.getAllByText('10%')[1]);
    fireEvent.click(screen.getByLabelText('Reset spindle override'));
    pressRepeatable(screen.getByText('25%'));
    pressRepeatable(screen.getByText('50%'));
    pressRepeatable(screen.getAllByText('100%').at(-1));

    expect(mockCommand.mock.calls).toEqual([
      ['feed_override', -10], ['feed_override', -1], ['feed_override', 1], ['feed_override', 10], ['feed_override', 0],
      ['spindle_override', -10], ['spindle_override', -1], ['spindle_override', 1], ['spindle_override', 10], ['spindle_override', 0],
      ['rapid_override', 25], ['rapid_override', 50], ['rapid_override', 100],
    ]);
  });

  test('refreshes settings with parameters before settings', () => {
    renderAppUI(<ControllerModal onClose={jest.fn()} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Controller Settings' }));
    fireEvent.click(screen.getByText('Refresh'));

    expect(mockWriteln.mock.calls).toEqual([['$#'], ['$$']]);
  });

  test('labels the rapid reset control and sends the reset command', () => {
    renderAppUI(<RapidOverride />);

    fireEvent.click(screen.getByLabelText('Reset rapid override'));

    expect(mockCommand.mock.calls).toEqual([['rapid_override', 0]]);
  });

  test('reports expansion through its controlled section toggle', () => {
    const onToggle = jest.fn();

    const { rerender } = renderAppUI(
      <ReportSection isExpanded={false} title="Queue Reports" onToggle={onToggle}>
        <div>Planner Buffer</div>
      </ReportSection>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Queue Reports' }));

    expect(onToggle).toHaveBeenCalledWith({ isExpanded: true });

    rerender(
      <ReportSection isExpanded title="Queue Reports" onToggle={onToggle}>
        <div>Planner Buffer</div>
      </ReportSection>
    );

    expect(screen.getByText('Planner Buffer')).toBeVisible();
  });

  test('opens controller information only when Grbl is connected', () => {
    const widgetProps = {
      onFork: jest.fn(),
      onRemove: jest.fn(),
      onViewChange: jest.fn(),
      sortable: { filterClassName: 'filter', handleClassName: 'handle' },
      view: 'normal',
      widgetId: 'grbl-test',
    };
    const { rerender } = renderAppUI(<GrblWidget {...widgetProps} />);

    fireEvent.click(screen.getByLabelText('Grbl controller info'));
    expect(screen.getByRole('tab', { name: 'Controller State' })).toBeVisible();

    mockStore.connection.state = 'disconnected';
    rerender(<GrblWidget {...widgetProps} />);

    expect(screen.queryByLabelText('Grbl controller info')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Grbl commands')).not.toBeInTheDocument();
  });

  test('sends the status report character from the Grbl commands control', () => {
    renderAppUI(
      <GrblWidget
        onFork={jest.fn()}
        onRemove={jest.fn()}
        onViewChange={jest.fn()}
        sortable={{ filterClassName: 'filter', handleClassName: 'handle' }}
        view="normal"
        widgetId="grbl-test"
      />
    );

    fireEvent.click(screen.getByLabelText('Grbl commands'));
    fireEvent.click(screen.getByText('Status Report (?)'));

    expect(mockWrite.mock.calls).toEqual([['?']]);
  });

  test('sends each Grbl command menu payload unchanged', () => {
    renderAppUI(
      <GrblWidget
        onFork={jest.fn()}
        onRemove={jest.fn()}
        onViewChange={jest.fn()}
        sortable={{ filterClassName: 'filter', handleClassName: 'handle' }}
        view="normal"
        widgetId="grbl-test"
      />
    );

    [
      'Check G-code Mode ($C)',
      'Homing ($H)',
      'Kill Alarm Lock ($X)',
      'Sleep ($SLP)',
      'Help ($)',
      'Settings ($$)',
      'View G-code Parameters ($#)',
      'View G-code Parser State ($G)',
      'View Build Info ($I)',
      'View Startup Blocks ($N)',
    ].forEach(label => {
      fireEvent.click(screen.getByLabelText('Grbl commands'));
      fireEvent.click(screen.getByText(label));
    });

    expect(mockCommand.mock.calls).toEqual([
      ['homing'],
      ['unlock'],
      ['sleep'],
    ]);
    expect(mockWriteln.mock.calls).toEqual([
      ['$C'],
      ['$'],
      ['$$'],
      ['$#'],
      ['$G'],
      ['$I'],
      ['$N'],
    ]);
  });
});
