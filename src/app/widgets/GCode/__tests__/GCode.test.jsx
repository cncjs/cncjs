import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderAppUI } from '@app/test/render';

let mockStore;
const mockTranslate = jest.fn(value => value);

jest.mock('react-redux', () => ({
  connect: mapStateToProps => Component => props => (
    <Component {...props} {...mapStateToProps(mockStore)} />
  ),
}));

jest.mock('@app/lib/controller', () => {
  throw new Error('GCode must not import the controller transport');
});

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: {
    _: mockTranslate,
  },
}));

jest.mock('@app/widgets/shared/WidgetConfigProvider', () => ({
  __esModule: true,
  default: ({ children }) => children,
}));

const GCode = require('../index').default;

const createSenderStatus = (overrides = {}) => ({
  loaded: true,
  name: 'part.nc',
  size: 2048,
  total: 12,
  sent: 6,
  received: 3,
  startTime: new Date(2025, 0, 2, 3, 4, 5).getTime(),
  finishTime: 0,
  elapsedTime: 3661000,
  remainingTime: 7322000,
  ...overrides,
});

const createStore = ({ units = 'G21', sender = createSenderStatus() } = {}) => ({
  controller: {
    modal: { units },
    boundingBox: {
      min: { x: 1, y: 2, z: 3 },
      max: { x: 26.4, y: 12, z: 8 },
    },
    sender: { status: sender },
  },
});

const renderGCode = (props = {}) => renderAppUI(
  <GCode
    widgetId="gcode"
    onFork={jest.fn()}
    onRemove={jest.fn()}
    onViewChange={jest.fn()}
    view="normal"
    sortable={{ handleClassName: '', filterClassName: '' }}
    {...props}
  />
);

describe('GCode widget', () => {
  beforeEach(() => {
    mockStore = createStore();
    jest.clearAllMocks();
  });

  test('renders an explicit empty state without stale sender presentation', () => {
    mockStore = createStore({
      sender: createSenderStatus({
        loaded: false,
        name: 'stale.nc',
        size: 99,
        total: 9,
        sent: 4,
        received: 3,
      }),
    });

    renderGCode();

    expect(screen.getByText('G-code not loaded')).toBeInTheDocument();
    expect(screen.queryByText('stale.nc')).not.toBeInTheDocument();
    expect(screen.queryByText('99 bytes')).not.toBeInTheDocument();
    expect(screen.queryByText('4 / 9')).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText('25.400 mm')).not.toBeInTheDocument();
  });

  test('renders loaded metadata, dimensions, counters, and received progress', () => {
    renderGCode();

    expect(screen.getByText('part.nc')).toBeInTheDocument();
    expect(screen.getByText('2048 bytes')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('6 / 12')).toBeInTheDocument();
    expect(screen.getByText('3 / 12')).toBeInTheDocument();
    expect(screen.getByText('25.400 mm')).toBeInTheDocument();
    expect(screen.getByText('10.000 mm')).toBeInTheDocument();
    expect(screen.getByText('5.000 mm')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(mockTranslate).toHaveBeenCalledWith('bytes');

    const progress = screen.getByRole('progressbar');
    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '12');
    expect(progress).toHaveAttribute('aria-valuenow', '3');
  });

  test.each([
    ['metric', 'G21', 'mm', '25.400 mm'],
    ['imperial', 'G20', 'in', '1.0000 in'],
  ])('preserves %s dimensions and unit labels', (_name, units, label, dimension) => {
    mockStore = createStore({ units });

    renderGCode();

    expect(screen.getByText(dimension)).toHaveTextContent(label);
  });

  test('preserves loaded values through controlled view interactions and rerenders', () => {
    const onViewChange = jest.fn();
    const view = renderGCode({ onViewChange });

    fireEvent.click(screen.getByRole('button', { name: 'Collapse' }));
    expect(onViewChange).toHaveBeenNthCalledWith(1, 'collapsed');

    view.rerender(
      <GCode
        widgetId="gcode"
        onFork={jest.fn()}
        onRemove={jest.fn()}
        onViewChange={onViewChange}
        view="collapsed"
        sortable={{ handleClassName: '', filterClassName: '' }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
    expect(onViewChange).toHaveBeenNthCalledWith(2, 'normal');

    ['collapsed', 'fullscreen', 'normal'].forEach(nextView => {
      view.rerender(
        <GCode
          widgetId="gcode"
          onFork={jest.fn()}
          onRemove={jest.fn()}
          onViewChange={onViewChange}
          view={nextView}
          sortable={{ handleClassName: '', filterClassName: '' }}
        />
      );
      expect(screen.getByText('part.nc')).toBeInTheDocument();
      expect(screen.getByText('3 / 12')).toBeInTheDocument();
    });
  });

  test('keeps fork and remove callbacks isolated from controller commands', () => {
    const onFork = jest.fn();
    const onRemove = jest.fn();
    renderGCode({ onFork, onRemove });

    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByText('Fork Widget'));
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByText('Remove Widget'));

    expect(onFork).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
