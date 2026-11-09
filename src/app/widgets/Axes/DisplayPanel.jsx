import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ensureArray } from 'ensure-type';
import {
  Box,
  Button,
  Dropdown as TonicDropdown,
  DropdownToggle,
  MenuDivider,
  MenuItem as TonicMenuItem,
  Tooltip,
} from '@tonic-ui/react';
import includes from 'lodash/includes';
import noop from 'lodash/noop';
import React, { Children, isValidElement, useEffect, useRef, useState } from 'react';
import {
  AXIS_E,
  AXIS_X,
  AXIS_Y,
  AXIS_Z,
  AXIS_A,
  AXIS_B,
  AXIS_C,
  METRIC_UNITS,
} from '@app/constants';
import {
  GRBL,
  MARLIN,
  SMOOTHIE,
  TINYG,
} from '@app/constants/controller';
import controller from '@app/lib/controller';
import i18n from '@app/lib/i18n';
import PositionLabel from './components/PositionLabel';
import PositionInput from './components/PositionInput';
import Taskbar from './components/Taskbar';
import { useAxes } from './context';
import styles from './index.styl';

const taskbarButtonSx = {
  display: 'inline-block',
  m: '2px 1px',
  p: 0,
  border: 0,
  minWidth: '24px',
  width: '24px',
  height: '32px',
  flexShrink: 0,
  fontWeight: 'normal',
  lineHeight: 0,
  textAlign: 'center',
  whiteSpace: 'nowrap',
  touchAction: 'manipulation',
  cursor: 'pointer',
  userSelect: 'none',
  backgroundImage: 'none',
  backgroundColor: 'inherit',
  color: 'text.primary',
  '&:hover': { backgroundColor: 'actions.hovered', textDecoration: 'none' },
  '&:disabled': { color: 'text.secondary', opacity: 0.65, cursor: 'not-allowed' },
  '&:disabled:hover': { backgroundColor: 'inherit' },
};

// Declares which gcode commands each controller supports in the axis dropdown.
// Grouped by dropdown section (Work Coordinate System → Temporary Offsets → Machine Coordinate System).
//
// Command               | G-code          | Description
// --------------------- | --------------- | ----------------------------------------------------
// canGoToWork           | G0              | rapid move to work zero
// canSetWCSOffset       | G10 L20         | set work coordinate offset
// canZeroTempOffset     | G92             | zero out temporary position offset
// canCancelTempOffset   | G92.1           | cancel G92 offsets
// canGoToMachine        | G53 G0          | move in machine coordinates
// canZeroOutMachine     | G28.3           | set axis position without motion (TinyG/g2core only)
const SUPPORTED_COMMANDS = {
  [GRBL]: {
    // Work Coordinate System
    canGoToWork: true,
    canSetWCSOffset: true,
    // Temporary Offsets
    canZeroTempOffset: true,
    canCancelTempOffset: true,
    // Machine Coordinate System
    canGoToMachine: true,
    canZeroOutMachine: false, // Grbl does not support setting machine zero without motion
  },
  [MARLIN]: {
    // Work Coordinate System
    canGoToWork: true,
    canSetWCSOffset: false, // Marlin uses G92 for work offsets, not G10 L20
    // Temporary Offsets
    canZeroTempOffset: true,
    canCancelTempOffset: false, // G92.1 requires CNC_COORDINATE_SYSTEMS compile flag
    // Machine Coordinate System
    canGoToMachine: true,
    canZeroOutMachine: false, // Marlin does not support setting machine zero without motion
  },
  [SMOOTHIE]: {
    // Work Coordinate System
    canGoToWork: true,
    canSetWCSOffset: true,
    // Temporary Offsets
    canZeroTempOffset: true,
    canCancelTempOffset: true,
    // Machine Coordinate System
    canGoToMachine: true,
    canZeroOutMachine: false, // Smoothie does not support setting machine zero without motion
  },
  [TINYG]: {
    // Work Coordinate System
    canGoToWork: true,
    canSetWCSOffset: true,
    // Temporary Offsets
    canZeroTempOffset: true,
    canCancelTempOffset: true,
    // Machine Coordinate System
    canGoToMachine: true,
    canZeroOutMachine: true,
  },
};

// Returns the all-axes homing command for the given controller type and reported axes.
//
// Controller     | Command
// -------------- | ----------------
// Grbl           | $H
// TinyG/g2core   | G28.2 X0 Y0 Z0 (composed from reported axes)
// Marlin         | G28
// Smoothie       | G28
const getHomeCommand = (controllerType, axes = ['x', 'y', 'z']) => {
  if (controllerType === GRBL) {
    return '$H';
  }

  if (controllerType === MARLIN || controllerType === SMOOTHIE) {
    return 'G28';
  }

  if (controllerType === TINYG) {
    // TinyG/g2core requires explicit axis parameters
    const axisParams = axes.map(axis => axis.toUpperCase() + '0').join(' ');
    return 'G28.2 ' + axisParams;
  }

  return '';
};

// Returns the single-axis homing command for the given controller type and axis.
//
// Controller     | Command                        | Notes
// -------------- | ------------------------------ | -----------------------------------
// Grbl           | $HX, $HY, $HZ                  | Requires compile-time flag
// TinyG/g2core   | G28.2 X0, G28.2 Y0, G28.2 Z0   | Value after axis letter is ignored
// Marlin         | G28 X, G28 Y, G28 Z            |
// Smoothie       | G28 X, G28 Y, G28 Z            |
const getAxisHomeCommand = (controllerType, axis) => {
  if (controllerType === GRBL) {
    return `$H${axis.toUpperCase()}`;
  }

  if (controllerType === MARLIN || controllerType === SMOOTHIE) {
    return `G28 ${axis.toUpperCase()}`;
  }

  if (controllerType === TINYG) {
    return `G28.2 ${axis.toUpperCase()}0`;
  }

  return '';
};

/**
 * @param {{ children?: React.ReactNode }} props
 */
function AxisCommandMenuToggle({ children }) {
  return children;
}

/**
 * @param {{ children?: React.ReactNode }} props
 */
function AxisCommandMenuList({ children }) {
  return children;
}

/**
 * @param {{
 *   active?: boolean,
 *   children?: React.ReactNode,
 *   disabled?: boolean,
 *   divider?: boolean,
 *   eventKey?: string | string[],
 *   header?: boolean,
 *   onSelect?: (eventKey: string | string[]) => void,
 * }} props
 */
function AxisCommandMenuItem({
  active = false,
  children,
  disabled = false,
  divider = false,
  eventKey,
  header = false,
  onSelect,
}) {
  if (divider) {
    return <MenuDivider />;
  }

  if (header) {
    return (
      <Box
        px="3x"
        py="2x"
        role="heading"
        fontSize="sm"
        color="text.secondary"
      >
        {children}
      </Box>
    );
  }

  return (
    <TonicMenuItem
      disabled={disabled}
      selected={active}
      onClick={() => onSelect?.(eventKey)}
    >
      {children}
    </TonicMenuItem>
  );
}

/**
 * @param {{
 *   children: React.ReactNode,
 *   disabled?: boolean,
 *   onSelect?: (eventKey: string | string[]) => void,
 * }} props
 */
function AxisCommandMenu({ children, disabled = false, onSelect }) {
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const handleOutsidePointerDown = event => {
      if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const document = rootRef.current.ownerDocument;
    document.addEventListener('pointerdown', handleOutsidePointerDown, true);
    return () => document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
  }, [isOpen]);

  const items = Children.toArray(children);
  const toggle = items.find(child => isValidElement(child) && child.type === AxisCommandMenuToggle);
  const list = items.find(child => isValidElement(child) && child.type === AxisCommandMenuList);

  // The `Dropdown` engine is data-driven — lift the item tree into item
  // objects (the JSX elements are never rendered, they are the data source).
  const menuItems = Children.toArray(list?.props.children).map(child => {
    if (!isValidElement(child)) {
      return child;
    }
    const { eventKey, header, divider } = child.props;
    if (divider) {
      return { type: 'divider' };
    }
    if (header) {
      return { type: 'custom', content: child.props.children };
    }
    return {
      value: eventKey,
      content: child.props.children,
      props: {
        disabled: child.props.disabled,
        selected: child.props.active,
      },
    };
  });

  return (
    <TonicDropdown
      ref={rootRef}
      portalled
      isOpen={isOpen}
      onOpen={() => setIsOpen(true)}
      onClose={() => setIsOpen(false)}
      slotProps={{ content: { ref: menuRef } }}
      items={menuItems}
      onChange={item => onSelect?.(item?.value)}
      renderItem={(item) => {
        if (item?.type === 'custom') {
          return (
            <Box
              px="3x"
              py="2x"
              role="heading"
              fontSize="sm"
              color="text.secondary"
            >
              {item.content}
            </Box>
          );
        }
        return item?.content;
      }}
      renderToggle={() => (
        <DropdownToggle
          aria-label={toggle?.props['aria-label']}
          className={toggle?.props.className}
          disabled={disabled}
        >
          {toggle?.props.children}
        </DropdownToggle>
      )}
    />
  );
}

AxisCommandMenu.Toggle = AxisCommandMenuToggle;
AxisCommandMenu.Menu = AxisCommandMenuList;

const Dropdown = AxisCommandMenu;
const MenuItem = AxisCommandMenuItem;

/**
 * @returns {JSX.Element}
 */
function DisplayPanel() {
  const context = useAxes();
  const handleSelect = (eventKey) => {
    const commands = ensureArray(eventKey);
    commands.forEach(command => controller.command('gcode', command));
  };

  const showPositionInput = (axis, reportedValue) => () => {
    context.onSetPositionInput({ axis, value: reportedValue });
  };

  const hidePositionInput = () => {
    context.onSetPositionInput(null);
  };

  const renderActionDropdown = ({ wcs }) => {
    const { canClick, controller: { type: controllerType }, axes } = context.state;
    const {
      canGoToWork,
      canSetWCSOffset,
      canZeroTempOffset,
      canCancelTempOffset,
      canGoToMachine,
      canZeroOutMachine,
    } = SUPPORTED_COMMANDS[controllerType] || {};
    const homingCommand = getHomeCommand(controllerType, axes);

    return (
      <Dropdown
        disabled={!canClick}
        onSelect={handleSelect}
      >
        <Dropdown.Toggle
          aria-label="Select work coordinate system"
          className={styles.actionDropdown}
          btnStyle="link"
          compact
          noCaret
        >
          <FontAwesomeIcon icon="caret-down" fixedWidth />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {wcs === 'G54' &&
            <MenuItem header>{i18n._('Work Coordinate System (G54)')}</MenuItem>}
          {wcs === 'G55' &&
            <MenuItem header>{i18n._('Work Coordinate System (G55)')}</MenuItem>}
          {wcs === 'G56' &&
            <MenuItem header>{i18n._('Work Coordinate System (G56)')}</MenuItem>}
          {wcs === 'G57' &&
            <MenuItem header>{i18n._('Work Coordinate System (G57)')}</MenuItem>}
          {wcs === 'G58' &&
            <MenuItem header>{i18n._('Work Coordinate System (G58)')}</MenuItem>}
          {wcs === 'G59' &&
            <MenuItem header>{i18n._('Work Coordinate System (G59)')}</MenuItem>}
          {canGoToWork && (
            <MenuItem
              eventKey="G0 X0 Y0 Z0"
              disabled={!canClick}
            >
              {i18n._('Go To Work Zero (G0 X0 Y0 Z0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G54' && (
            <MenuItem
              eventKey="G10 L20 P1 X0 Y0 Z0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work Offsets (G10 L20 P1 X0 Y0 Z0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G55' && (
            <MenuItem
              eventKey="G10 L20 P2 X0 Y0 Z0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work Offsets (G10 L20 P2 X0 Y0 Z0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G56' && (
            <MenuItem
              eventKey="G10 L20 P3 X0 Y0 Z0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work Offsets (G10 L20 P3 X0 Y0 Z0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G57' && (
            <MenuItem
              eventKey="G10 L20 P4 X0 Y0 Z0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work Offsets (G10 L20 P4 X0 Y0 Z0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G58' && (
            <MenuItem
              eventKey="G10 L20 P5 X0 Y0 Z0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work Offsets (G10 L20 P5 X0 Y0 Z0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G59' && (
            <MenuItem
              eventKey="G10 L20 P6 X0 Y0 Z0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work Offsets (G10 L20 P6 X0 Y0 Z0)')}
            </MenuItem>
          )}
          <MenuItem divider />
          <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
          {canZeroTempOffset && (
            <MenuItem
              eventKey="G92 X0 Y0 Z0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Temporary Offsets (G92 X0 Y0 Z0)')}
            </MenuItem>
          )}
          {canCancelTempOffset && (
            <MenuItem
              eventKey="G92.1 X0 Y0 Z0"
              disabled={!canClick}
            >
              {i18n._('Un-Zero Out Temporary Offsets (G92.1 X0 Y0 Z0)')}
            </MenuItem>
          )}
          <MenuItem divider />
          <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
          {canGoToMachine && (
            <MenuItem
              eventKey="G53 G0 X0 Y0 Z0"
              disabled={!canClick}
            >
              {i18n._('Go To Machine Zero (G53 G0 X0 Y0 Z0)')}
            </MenuItem>
          )}
          {canZeroOutMachine && (
            <MenuItem
              eventKey="G28.3 X0 Y0 Z0"
              disabled={!canClick}
            >
              {i18n._('Set Machine Zero (G28.3 X0 Y0 Z0)')}
            </MenuItem>
          )}
          <MenuItem
            eventKey={homingCommand}
            disabled={!canClick}
          >
            {i18n._('Home Machine ({{command}})', { command: homingCommand })}
          </MenuItem>
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  const renderActionDropdownForAxisE = ({ wcs }) => {
    // TODO
    return null;
  };

  const renderActionDropdownForAxisX = ({ wcs }) => {
    const { canClick, controller: { type: controllerType } } = context.state;
    const {
      canGoToWork,
      canSetWCSOffset,
      canZeroTempOffset,
      canCancelTempOffset,
      canGoToMachine,
      canZeroOutMachine,
    } = SUPPORTED_COMMANDS[controllerType] || {};
    const axisHomingCommand = getAxisHomeCommand(controllerType, 'X');

    return (
      <Dropdown
        disabled={!canClick}
        onSelect={handleSelect}
      >
        <Dropdown.Toggle
          aria-label="X axis actions"
          className={styles.actionDropdown}
          btnStyle="link"
          compact
          noCaret
        >
          <FontAwesomeIcon icon="ellipsis-v" fixedWidth />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {wcs === 'G54' &&
            <MenuItem header>{i18n._('Work Coordinate System (G54)')}</MenuItem>}
          {wcs === 'G55' &&
            <MenuItem header>{i18n._('Work Coordinate System (G55)')}</MenuItem>}
          {wcs === 'G56' &&
            <MenuItem header>{i18n._('Work Coordinate System (G56)')}</MenuItem>}
          {wcs === 'G57' &&
            <MenuItem header>{i18n._('Work Coordinate System (G57)')}</MenuItem>}
          {wcs === 'G58' &&
            <MenuItem header>{i18n._('Work Coordinate System (G58)')}</MenuItem>}
          {wcs === 'G59' &&
            <MenuItem header>{i18n._('Work Coordinate System (G59)')}</MenuItem>}
          {canGoToWork && (
            <MenuItem
              eventKey="G0 X0"
              disabled={!canClick}
            >
              {i18n._('Go To Work Zero On X Axis (G0 X0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G54' && (
            <MenuItem
              eventKey="G10 L20 P1 X0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work X Axis (G10 L20 P1 X0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G55' && (
            <MenuItem
              eventKey="G10 L20 P2 X0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work X Axis (G10 L20 P2 X0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G56' && (
            <MenuItem
              eventKey="G10 L20 P3 X0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work X Axis (G10 L20 P3 X0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G57' && (
            <MenuItem
              eventKey="G10 L20 P4 X0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work X Axis (G10 L20 P4 X0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G58' && (
            <MenuItem
              eventKey="G10 L20 P5 X0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work X Axis (G10 L20 P5 X0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G59' && (
            <MenuItem
              eventKey="G10 L20 P6 X0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work X Axis (G10 L20 P6 X0)')}
            </MenuItem>
          )}
          <MenuItem divider />
          <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
          {canZeroTempOffset && (
            <MenuItem
              eventKey="G92 X0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Temporary X Axis (G92 X0)')}
            </MenuItem>
          )}
          {canCancelTempOffset && (
            <MenuItem
              eventKey="G92.1 X0"
              disabled={!canClick}
            >
              {i18n._('Un-Zero Out Temporary X Axis (G92.1 X0)')}
            </MenuItem>
          )}
          <MenuItem divider />
          <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
          {canGoToMachine && (
            <MenuItem
              eventKey="G53 G0 X0"
              disabled={!canClick}
            >
              {i18n._('Go To Machine Zero On X Axis (G53 G0 X0)')}
            </MenuItem>
          )}
          {canZeroOutMachine && (
            <MenuItem
              eventKey="G28.3 X0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Machine X Axis (G28.3 X0)')}
            </MenuItem>
          )}
          <MenuItem
            eventKey={axisHomingCommand}
            disabled={!canClick}
          >
            {i18n._('Home Machine X Axis ({{command}})', { command: axisHomingCommand })}
          </MenuItem>
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  const renderActionDropdownForAxisY = ({ wcs }) => {
    const { canClick, controller: { type: controllerType } } = context.state;
    const {
      canGoToWork,
      canSetWCSOffset,
      canZeroTempOffset,
      canCancelTempOffset,
      canGoToMachine,
      canZeroOutMachine,
    } = SUPPORTED_COMMANDS[controllerType] || {};
    const axisHomingCommand = getAxisHomeCommand(controllerType, 'Y');

    return (
      <Dropdown
        disabled={!canClick}
        onSelect={handleSelect}
      >
        <Dropdown.Toggle
          aria-label="Y axis actions"
          className={styles.actionDropdown}
          btnStyle="link"
          compact
          noCaret
        >
          <FontAwesomeIcon icon="ellipsis-v" fixedWidth />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {wcs === 'G54' &&
            <MenuItem header>{i18n._('Work Coordinate System (G54)')}</MenuItem>}
          {wcs === 'G55' &&
            <MenuItem header>{i18n._('Work Coordinate System (G55)')}</MenuItem>}
          {wcs === 'G56' &&
            <MenuItem header>{i18n._('Work Coordinate System (G56)')}</MenuItem>}
          {wcs === 'G57' &&
            <MenuItem header>{i18n._('Work Coordinate System (G57)')}</MenuItem>}
          {wcs === 'G58' &&
            <MenuItem header>{i18n._('Work Coordinate System (G58)')}</MenuItem>}
          {wcs === 'G59' &&
            <MenuItem header>{i18n._('Work Coordinate System (G59)')}</MenuItem>}
          {canGoToWork && (
            <MenuItem
              eventKey="G0 Y0"
              disabled={!canClick}
            >
              {i18n._('Go To Work Zero On Y Axis (G0 Y0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G54' && (
            <MenuItem
              eventKey="G10 L20 P1 Y0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work Y Axis (G10 L20 P1 Y0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G55' && (
            <MenuItem
              eventKey="G10 L20 P2 Y0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work Y Axis (G10 L20 P2 Y0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G56' && (
            <MenuItem
              eventKey="G10 L20 P3 Y0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work Y Axis (G10 L20 P3 Y0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G57' && (
            <MenuItem
              eventKey="G10 L20 P4 Y0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work Y Axis (G10 L20 P4 Y0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G58' && (
            <MenuItem
              eventKey="G10 L20 P5 Y0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work Y Axis (G10 L20 P5 Y0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G59' && (
            <MenuItem
              eventKey="G10 L20 P6 Y0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work Y Axis (G10 L20 P6 Y0)')}
            </MenuItem>
          )}
          <MenuItem divider />
          <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
          {canZeroTempOffset && (
            <MenuItem
              eventKey="G92 Y0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Temporary Y Axis (G92 Y0)')}
            </MenuItem>
          )}
          {canCancelTempOffset && (
            <MenuItem
              eventKey="G92.1 Y0"
              disabled={!canClick}
            >
              {i18n._('Un-Zero Out Temporary Y Axis (G92.1 Y0)')}
            </MenuItem>
          )}
          <MenuItem divider />
          <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
          {canGoToMachine && (
            <MenuItem
              eventKey="G53 G0 Y0"
              disabled={!canClick}
            >
              {i18n._('Go To Machine Zero On Y Axis (G53 G0 Y0)')}
            </MenuItem>
          )}
          {canZeroOutMachine && (
            <MenuItem
              eventKey="G28.3 Y0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Machine Y Axis (G28.3 Y0)')}
            </MenuItem>
          )}
          <MenuItem
            eventKey={axisHomingCommand}
            disabled={!canClick}
          >
            {i18n._('Home Machine Y Axis ({{command}})', { command: axisHomingCommand })}
          </MenuItem>
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  const renderActionDropdownForAxisZ = ({ wcs }) => {
    const { canClick, controller: { type: controllerType } } = context.state;
    const {
      canGoToWork,
      canSetWCSOffset,
      canZeroTempOffset,
      canCancelTempOffset,
      canGoToMachine,
      canZeroOutMachine,
    } = SUPPORTED_COMMANDS[controllerType] || {};
    const axisHomingCommand = getAxisHomeCommand(controllerType, 'Z');

    return (
      <Dropdown
        disabled={!canClick}
        onSelect={handleSelect}
      >
        <Dropdown.Toggle
          aria-label="Z axis actions"
          className={styles.actionDropdown}
          btnStyle="link"
          compact
          noCaret
        >
          <FontAwesomeIcon icon="ellipsis-v" fixedWidth />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {wcs === 'G54' &&
            <MenuItem header>{i18n._('Work Coordinate System (G54)')}</MenuItem>}
          {wcs === 'G55' &&
            <MenuItem header>{i18n._('Work Coordinate System (G55)')}</MenuItem>}
          {wcs === 'G56' &&
            <MenuItem header>{i18n._('Work Coordinate System (G56)')}</MenuItem>}
          {wcs === 'G57' &&
            <MenuItem header>{i18n._('Work Coordinate System (G57)')}</MenuItem>}
          {wcs === 'G58' &&
            <MenuItem header>{i18n._('Work Coordinate System (G58)')}</MenuItem>}
          {wcs === 'G59' &&
            <MenuItem header>{i18n._('Work Coordinate System (G59)')}</MenuItem>}
          {canGoToWork && (
            <MenuItem
              eventKey="G0 Z0"
              disabled={!canClick}
            >
              {i18n._('Go To Work Zero On Z Axis (G0 Z0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G54' && (
            <MenuItem
              eventKey="G10 L20 P1 Z0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work Z Axis (G10 L20 P1 Z0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G55' && (
            <MenuItem
              eventKey="G10 L20 P2 Z0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work Z Axis (G10 L20 P2 Z0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G56' && (
            <MenuItem
              eventKey="G10 L20 P3 Z0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work Z Axis (G10 L20 P3 Z0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G57' && (
            <MenuItem
              eventKey="G10 L20 P4 Z0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work Z Axis (G10 L20 P4 Z0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G58' && (
            <MenuItem
              eventKey="G10 L20 P5 Z0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work Z Axis (G10 L20 P5 Z0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G59' && (
            <MenuItem
              eventKey="G10 L20 P6 Z0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work Z Axis (G10 L20 P6 Z0)')}
            </MenuItem>
          )}
          <MenuItem divider />
          <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
          {canZeroTempOffset && (
            <MenuItem
              eventKey="G92 Z0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Temporary Z Axis (G92 Z0)')}
            </MenuItem>
          )}
          {canCancelTempOffset && (
            <MenuItem
              eventKey="G92.1 Z0"
              disabled={!canClick}
            >
              {i18n._('Un-Zero Out Temporary Z Axis (G92.1 Z0)')}
            </MenuItem>
          )}
          <MenuItem divider />
          <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
          {canGoToMachine && (
            <MenuItem
              eventKey="G53 G0 Z0"
              disabled={!canClick}
            >
              {i18n._('Go To Machine Zero On Z Axis (G53 G0 Z0)')}
            </MenuItem>
          )}
          {canZeroOutMachine && (
            <MenuItem
              eventKey="G28.3 Z0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Machine Z Axis (G28.3 Z0)')}
            </MenuItem>
          )}
          <MenuItem
            eventKey={axisHomingCommand}
            disabled={!canClick}
          >
            {i18n._('Home Machine Z Axis ({{command}})', { command: axisHomingCommand })}
          </MenuItem>
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  const renderActionDropdownForAxisA = ({ wcs }) => {
    const { canClick, controller: { type: controllerType } } = context.state;
    const {
      canGoToWork,
      canSetWCSOffset,
      canZeroTempOffset,
      canCancelTempOffset,
      canGoToMachine,
      canZeroOutMachine,
    } = SUPPORTED_COMMANDS[controllerType] || {};
    const axisHomingCommand = getAxisHomeCommand(controllerType, 'A');

    return (
      <Dropdown
        disabled={!canClick}
        onSelect={handleSelect}
      >
        <Dropdown.Toggle
          aria-label="A axis actions"
          className={styles.actionDropdown}
          btnStyle="link"
          compact
          noCaret
        >
          <FontAwesomeIcon icon="ellipsis-v" fixedWidth />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {wcs === 'G54' &&
            <MenuItem header>{i18n._('Work Coordinate System (G54)')}</MenuItem>}
          {wcs === 'G55' &&
            <MenuItem header>{i18n._('Work Coordinate System (G55)')}</MenuItem>}
          {wcs === 'G56' &&
            <MenuItem header>{i18n._('Work Coordinate System (G56)')}</MenuItem>}
          {wcs === 'G57' &&
            <MenuItem header>{i18n._('Work Coordinate System (G57)')}</MenuItem>}
          {wcs === 'G58' &&
            <MenuItem header>{i18n._('Work Coordinate System (G58)')}</MenuItem>}
          {wcs === 'G59' &&
            <MenuItem header>{i18n._('Work Coordinate System (G59)')}</MenuItem>}
          {canGoToWork && (
            <MenuItem
              eventKey="G0 A0"
              disabled={!canClick}
            >
              {i18n._('Go To Work Zero On A Axis (G0 A0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G54' && (
            <MenuItem
              eventKey="G10 L20 P1 A0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work A Axis (G10 L20 P1 A0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G55' && (
            <MenuItem
              eventKey="G10 L20 P2 A0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work A Axis (G10 L20 P2 A0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G56' && (
            <MenuItem
              eventKey="G10 L20 P3 A0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work A Axis (G10 L20 P3 A0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G57' && (
            <MenuItem
              eventKey="G10 L20 P4 A0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work A Axis (G10 L20 P4 A0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G58' && (
            <MenuItem
              eventKey="G10 L20 P5 A0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work A Axis (G10 L20 P5 A0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G59' && (
            <MenuItem
              eventKey="G10 L20 P6 A0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work A Axis (G10 L20 P6 A0)')}
            </MenuItem>
          )}
          <MenuItem divider />
          <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
          {canZeroTempOffset && (
            <MenuItem
              eventKey="G92 A0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Temporary A Axis (G92 A0)')}
            </MenuItem>
          )}
          {canCancelTempOffset && (
            <MenuItem
              eventKey="G92.1 A0"
              disabled={!canClick}
            >
              {i18n._('Un-Zero Out Temporary A Axis (G92.1 A0)')}
            </MenuItem>
          )}
          <MenuItem divider />
          <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
          {canGoToMachine && (
            <MenuItem
              eventKey="G53 G0 A0"
              disabled={!canClick}
            >
              {i18n._('Go To Machine Zero On A Axis (G53 G0 A0)')}
            </MenuItem>
          )}
          {canZeroOutMachine && (
            <MenuItem
              eventKey="G28.3 A0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Machine A Axis (G28.3 A0)')}
            </MenuItem>
          )}
          <MenuItem
            eventKey={axisHomingCommand}
            disabled={!canClick}
          >
            {i18n._('Home Machine A Axis ({{command}})', { command: axisHomingCommand })}
          </MenuItem>
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  const renderActionDropdownForAxisB = ({ wcs }) => {
    const { canClick, controller: { type: controllerType } } = context.state;
    const {
      canGoToWork,
      canSetWCSOffset,
      canZeroTempOffset,
      canCancelTempOffset,
      canGoToMachine,
      canZeroOutMachine,
    } = SUPPORTED_COMMANDS[controllerType] || {};
    const axisHomingCommand = getAxisHomeCommand(controllerType, 'B');

    return (
      <Dropdown
        disabled={!canClick}
        onSelect={handleSelect}
      >
        <Dropdown.Toggle
          aria-label="B axis actions"
          className={styles.actionDropdown}
          btnStyle="link"
          compact
          noCaret
        >
          <FontAwesomeIcon icon="ellipsis-v" fixedWidth />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {wcs === 'G54' &&
            <MenuItem header>{i18n._('Work Coordinate System (G54)')}</MenuItem>}
          {wcs === 'G55' &&
            <MenuItem header>{i18n._('Work Coordinate System (G55)')}</MenuItem>}
          {wcs === 'G56' &&
            <MenuItem header>{i18n._('Work Coordinate System (G56)')}</MenuItem>}
          {wcs === 'G57' &&
            <MenuItem header>{i18n._('Work Coordinate System (G57)')}</MenuItem>}
          {wcs === 'G58' &&
            <MenuItem header>{i18n._('Work Coordinate System (G58)')}</MenuItem>}
          {wcs === 'G59' &&
            <MenuItem header>{i18n._('Work Coordinate System (G59)')}</MenuItem>}
          {canGoToWork && (
            <MenuItem
              eventKey="G0 B0"
              disabled={!canClick}
            >
              {i18n._('Go To Work Zero On B Axis (G0 B0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G54' && (
            <MenuItem
              eventKey="G10 L20 P1 B0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work B Axis (G10 L20 P1 B0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G55' && (
            <MenuItem
              eventKey="G10 L20 P2 B0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work B Axis (G10 L20 P2 B0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G56' && (
            <MenuItem
              eventKey="G10 L20 P3 B0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work B Axis (G10 L20 P3 B0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G57' && (
            <MenuItem
              eventKey="G10 L20 P4 B0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work B Axis (G10 L20 P4 B0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G58' && (
            <MenuItem
              eventKey="G10 L20 P5 B0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work B Axis (G10 L20 P5 B0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G59' && (
            <MenuItem
              eventKey="G10 L20 P6 B0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work B Axis (G10 L20 P6 B0)')}
            </MenuItem>
          )}
          <MenuItem divider />
          <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
          {canZeroTempOffset && (
            <MenuItem
              eventKey="G92 B0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Temporary B Axis (G92 B0)')}
            </MenuItem>
          )}
          {canCancelTempOffset && (
            <MenuItem
              eventKey="G92.1 B0"
              disabled={!canClick}
            >
              {i18n._('Un-Zero Out Temporary B Axis (G92.1 B0)')}
            </MenuItem>
          )}
          <MenuItem divider />
          <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
          {canGoToMachine && (
            <MenuItem
              eventKey="G53 G0 B0"
              disabled={!canClick}
            >
              {i18n._('Go To Machine Zero On B Axis (G53 G0 B0)')}
            </MenuItem>
          )}
          {canZeroOutMachine && (
            <MenuItem
              eventKey="G28.3 B0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Machine B Axis (G28.3 B0)')}
            </MenuItem>
          )}
          <MenuItem
            eventKey={axisHomingCommand}
            disabled={!canClick}
          >
            {i18n._('Home Machine B Axis ({{command}})', { command: axisHomingCommand })}
          </MenuItem>
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  const renderActionDropdownForAxisC = ({ wcs }) => {
    const { canClick, controller: { type: controllerType } } = context.state;
    const {
      canGoToWork,
      canSetWCSOffset,
      canZeroTempOffset,
      canCancelTempOffset,
      canGoToMachine,
      canZeroOutMachine,
    } = SUPPORTED_COMMANDS[controllerType] || {};
    const axisHomingCommand = getAxisHomeCommand(controllerType, 'C');

    return (
      <Dropdown
        disabled={!canClick}
        onSelect={handleSelect}
      >
        <Dropdown.Toggle
          aria-label="C axis actions"
          className={styles.actionDropdown}
          btnStyle="link"
          compact
          noCaret
        >
          <FontAwesomeIcon icon="ellipsis-v" fixedWidth />
        </Dropdown.Toggle>
        <Dropdown.Menu>
          {wcs === 'G54' &&
            <MenuItem header>{i18n._('Work Coordinate System (G54)')}</MenuItem>}
          {wcs === 'G55' &&
            <MenuItem header>{i18n._('Work Coordinate System (G55)')}</MenuItem>}
          {wcs === 'G56' &&
            <MenuItem header>{i18n._('Work Coordinate System (G56)')}</MenuItem>}
          {wcs === 'G57' &&
            <MenuItem header>{i18n._('Work Coordinate System (G57)')}</MenuItem>}
          {wcs === 'G58' &&
            <MenuItem header>{i18n._('Work Coordinate System (G58)')}</MenuItem>}
          {wcs === 'G59' &&
            <MenuItem header>{i18n._('Work Coordinate System (G59)')}</MenuItem>}
          {canGoToWork && (
            <MenuItem
              eventKey="G0 C0"
              disabled={!canClick}
            >
              {i18n._('Go To Work Zero On C Axis (G0 C0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G54' && (
            <MenuItem
              eventKey="G10 L20 P1 C0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work C Axis (G10 L20 P1 C0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G55' && (
            <MenuItem
              eventKey="G10 L20 P2 C0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work C Axis (G10 L20 P2 C0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G56' && (
            <MenuItem
              eventKey="G10 L20 P3 C0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work C Axis (G10 L20 P3 C0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G57' && (
            <MenuItem
              eventKey="G10 L20 P4 C0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work C Axis (G10 L20 P4 C0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G58' && (
            <MenuItem
              eventKey="G10 L20 P5 C0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work C Axis (G10 L20 P5 C0)')}
            </MenuItem>
          )}
          {canSetWCSOffset && wcs === 'G59' && (
            <MenuItem
              eventKey="G10 L20 P6 C0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Work C Axis (G10 L20 P6 C0)')}
            </MenuItem>
          )}
          <MenuItem divider />
          <MenuItem header>{i18n._('Temporary Offsets (G92)')}</MenuItem>
          {canZeroTempOffset && (
            <MenuItem
              eventKey="G92 C0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Temporary C Axis (G92 C0)')}
            </MenuItem>
          )}
          {canCancelTempOffset && (
            <MenuItem
              eventKey="G92.1 C0"
              disabled={!canClick}
            >
              {i18n._('Un-Zero Out Temporary C Axis (G92.1 C0)')}
            </MenuItem>
          )}
          <MenuItem divider />
          <MenuItem header>{i18n._('Machine Coordinate System (G53)')}</MenuItem>
          {canGoToMachine && (
            <MenuItem
              eventKey="G53 G0 C0"
              disabled={!canClick}
            >
              {i18n._('Go To Machine Zero On C Axis (G53 G0 C0)')}
            </MenuItem>
          )}
          {canZeroOutMachine && (
            <MenuItem
              eventKey="G28.3 C0"
              disabled={!canClick}
            >
              {i18n._('Zero Out Machine C Axis (G28.3 C0)')}
            </MenuItem>
          )}
          <MenuItem
            eventKey={axisHomingCommand}
            disabled={!canClick}
          >
            {i18n._('Home Machine C Axis ({{command}})', { command: axisHomingCommand })}
          </MenuItem>
        </Dropdown.Menu>
      </Dropdown>
    );
  };

  const renderAxis = (axis) => {
    const { canClick, units, machinePosition, workPosition, jog, controllerType, positionInput } = context.state;
    const supportedCommands = SUPPORTED_COMMANDS[controllerType] || {};
    const {
      onGetJogDistance,
      onGetWorkCoordinateSystem,
      onJog,
      onSetWorkOffsets,
    } = context;
    const wcs = onGetWorkCoordinateSystem();
    const lengthUnits = (units === METRIC_UNITS) ? i18n._('mm') : i18n._('in');
    const degreeUnits = i18n._('deg');
    const mpos = machinePosition[axis] || '0.000';
    const wpos = workPosition[axis] || '0.000';
    const axisLabel = axis.toUpperCase();
    const displayUnits = {
      [AXIS_E]: lengthUnits,
      [AXIS_X]: lengthUnits,
      [AXIS_Y]: lengthUnits,
      [AXIS_Z]: lengthUnits,
      [AXIS_A]: degreeUnits,
      [AXIS_B]: degreeUnits,
      [AXIS_C]: degreeUnits
    }[axis] || '';
    const renderActionDropdown = {
      [AXIS_E]: renderActionDropdownForAxisE,
      [AXIS_X]: renderActionDropdownForAxisX,
      [AXIS_Y]: renderActionDropdownForAxisY,
      [AXIS_Z]: renderActionDropdownForAxisZ,
      [AXIS_A]: renderActionDropdownForAxisA,
      [AXIS_B]: renderActionDropdownForAxisB,
      [AXIS_C]: renderActionDropdownForAxisC
    }[axis] || noop;
    const canZeroOutMachine = canClick && supportedCommands.canZeroOutMachine;
    const axisHomingCommand = getAxisHomeCommand(controllerType, axisLabel);
    const canMoveBackward = canClick;
    const canMoveForward = canClick;
    const canZeroOutWorkOffsets = canClick;
    const canModifyWorkPosition = canClick && positionInput?.axis !== axis;
    const isPositionInputVisible = canClick && positionInput?.axis === axis;
    const highlightAxis = canClick && (jog.keypad || jog.axis === axis);

    return (
      <tr>
        <td className={styles.coordinate}>
          <Box fontSize="24px" fontWeight={highlightAxis ? 'bold' : 'normal'}>
            {axisLabel}
          </Box>
          <Box textAlign="center" fontSize="12px" lineHeight="20px">{displayUnits}</Box>
        </td>
        <td className={styles.machinePosition}>
          <PositionLabel value={mpos} />
          <Taskbar>
            <Box style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Tooltip
                portalled
                label={i18n._('Zero Out Machine')}
                disabled={!canZeroOutMachine}
                closeOnClick
                enterDelay={0}
                placement="bottom"
              >
                <Button
                  variant="ghost" sx={taskbarButtonSx}
                  aria-label={`${i18n._('Zero Out Machine')}: ${axisLabel}`}
                  disabled={!canZeroOutMachine}
                  onClick={() => {
                    controller.command('gcode', `G28.3 ${axisLabel}0`);
                  }}
                >
                  <FontAwesomeIcon icon="map-marker-alt" fixedWidth />
                </Button>
              </Tooltip>
              <Tooltip
                portalled
                label={i18n._('Home Machine')}
                disabled={!canClick}
                closeOnClick
                enterDelay={0}
                placement="bottom"
              >
                <Button
                  variant="ghost" sx={taskbarButtonSx}
                  aria-label={`Home: ${axisLabel}`}
                  disabled={!canClick}
                  onClick={() => {
                    controller.command('gcode', axisHomingCommand);
                  }}
                >
                  <FontAwesomeIcon icon="home" fixedWidth />
                </Button>
              </Tooltip>
            </Box>
          </Taskbar>
        </td>
        <td className={styles.workPosition}>
          {isPositionInputVisible && (
            <PositionInput
              style={{ margin: '5px 0' }}
              value={positionInput.value}
              onChange={(value) => context.onSetPositionInput({ axis, value })}
              onSave={(value) => {
                onSetWorkOffsets(axis, value);
                hidePositionInput();
              }}
              onCancel={hidePositionInput}
            />
          )}
          {!isPositionInputVisible &&
            <PositionLabel value={wpos} />}
          <Taskbar>
            <Box style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <Tooltip
                portalled
                label={i18n._('Move Backward')}
                disabled={!canMoveBackward}
                closeOnClick
                enterDelay={0}
                placement="bottom"
              >
                <Button
                  variant="ghost" sx={taskbarButtonSx}
                  aria-label={`Move ${axisLabel} backward`}
                  disabled={!canMoveBackward}
                  onClick={() => {
                    const distance = onGetJogDistance();
                    onJog({ [axis]: -distance });
                  }}
                >
                  <FontAwesomeIcon icon="minus" fixedWidth />
                </Button>
              </Tooltip>
              <Tooltip
                portalled
                label={i18n._('Move Forward')}
                disabled={!canMoveForward}
                closeOnClick
                enterDelay={0}
                placement="bottom"
              >
                <Button
                  variant="ghost" sx={taskbarButtonSx}
                  aria-label={`Move ${axisLabel} forward`}
                  disabled={!canMoveForward}
                  onClick={() => {
                    const distance = onGetJogDistance();
                    onJog({ [axis]: distance });
                  }}
                >
                  <FontAwesomeIcon icon="plus" fixedWidth />
                </Button>
              </Tooltip>
              <Tooltip
                portalled
                label={i18n._('Zero Out Work Offsets')}
                disabled={!canZeroOutWorkOffsets}
                closeOnClick
                enterDelay={0}
                placement="bottom"
              >
                <Button
                  variant="ghost" sx={taskbarButtonSx}
                  aria-label={`Zero out ${axisLabel} work offsets`}
                  disabled={!canZeroOutWorkOffsets}
                  onClick={() => {
                    onSetWorkOffsets(axis, 0);
                  }}
                >
                  <FontAwesomeIcon icon="map-marker-alt" fixedWidth />
                </Button>
              </Tooltip>
              <Tooltip
                portalled
                label={i18n._('Set Work Offsets')}
                disabled={!canModifyWorkPosition}
                closeOnClick
                enterDelay={0}
                placement="bottom"
              >
                <Button
                  variant="ghost" sx={taskbarButtonSx}
                  aria-label={`Set ${axisLabel} work offsets`}
                  active={isPositionInputVisible}
                  disabled={!canModifyWorkPosition}
                  onClick={showPositionInput(axis, wpos)}
                >
                  <FontAwesomeIcon icon="pencil-alt" fixedWidth />
                </Button>
              </Tooltip>
            </Box>
          </Taskbar>
        </td>
        <td className={styles.action}>
          {renderActionDropdown({ wcs })}
        </td>
      </tr>
    );
  };

  const { axes, machinePosition, workPosition } = context.state;
  const wcs = context.onGetWorkCoordinateSystem();
  const hasAxisE = (machinePosition.e !== undefined && workPosition.e !== undefined);
  const hasAxisX = includes(axes, AXIS_X);
  const hasAxisY = includes(axes, AXIS_Y);
  const hasAxisZ = includes(axes, AXIS_Z);
  const hasAxisA = includes(axes, AXIS_A);
  const hasAxisB = includes(axes, AXIS_B);
  const hasAxisC = includes(axes, AXIS_C);

  return (
    <Box
      className={styles.displayPanel}
      sx={{
        mb: '10px',
        '&:last-child': { mb: 0 },
        '& table': { borderCollapse: 'collapse' },
        '& th, & td': { border: 1, borderColor: 'border.secondary' },
      }}
    >
      <Box overflowX="auto">
        <table style={{ width: '100%', minWidth: '240px', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th scope="col" className={styles.coordinate} title={i18n._('Axis')}>{i18n._('Axis')}</th>
              <th scope="col" className={styles.positionHeading} title={i18n._('Machine Position')}>
                <Box as="span" sx={{ display: 'inline-block', maxWidth: '6em' }}>{i18n._('Machine Position')}</Box>
              </th>
              <th scope="col" className={styles.positionHeading} title={i18n._('Work Position')}>
                <Box as="span" sx={{ display: 'inline-block', maxWidth: '6em' }}>{i18n._('Work Position')}</Box>
              </th>
              <th scope="col" className={styles.action}>
                {renderActionDropdown({ wcs })}
              </th>
            </tr>
          </thead>
          <tbody>
            {hasAxisE && renderAxis(AXIS_E)}
            {hasAxisX && renderAxis(AXIS_X)}
            {hasAxisY && renderAxis(AXIS_Y)}
            {hasAxisZ && renderAxis(AXIS_Z)}
            {hasAxisA && renderAxis(AXIS_A)}
            {hasAxisB && renderAxis(AXIS_B)}
            {hasAxisC && renderAxis(AXIS_C)}
          </tbody>
        </table>
      </Box>
    </Box>
  );
}

export default DisplayPanel;
