import React from 'react';
import {
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAppUI } from '@app/test/render';

const mockMutationOptions = {};
const mockNotifyToast = jest.fn();
const mockUseToast = jest.fn(() => mockNotifyToast);

const mockMutationResults = {};
const mockMutationResult = (key) => {
  if (!mockMutationResults[key]) {
    mockMutationResults[key] = { isLoading: false, mutate: jest.fn() };
  }
  return mockMutationResults[key];
};

const mockCreateCommandMutation = jest.fn(options => {
  mockMutationOptions.createCommand = options;
  return mockMutationResult('createCommand');
});
const mockUpdateCommandMutation = jest.fn(options => {
  mockMutationOptions.updateCommand = options;
  return mockMutationResult('updateCommand');
});
const mockCreateEventMutation = jest.fn(options => {
  mockMutationOptions.createEvent = options;
  return mockMutationResult('createEvent');
});
const mockUpdateEventMutation = jest.fn(options => {
  mockMutationOptions.updateEvent = options;
  return mockMutationResult('updateEvent');
});
const mockCreateMachineMutation = jest.fn(options => {
  mockMutationOptions.createMachine = options;
  return mockMutationResult('createMachine');
});
const mockUpdateMachineMutation = jest.fn(options => {
  mockMutationOptions.updateMachine = options;
  return mockMutationResult('updateMachine');
});
const mockCreateMacroMutation = jest.fn(options => {
  mockMutationOptions.createMacro = options;
  return mockMutationResult('createMacro');
});
const mockUpdateMacroMutation = jest.fn(options => {
  mockMutationOptions.updateMacro = options;
  return mockMutationResult('updateMacro');
});
const mockCreateUserMutation = jest.fn(options => {
  mockMutationOptions.createUser = options;
  return mockMutationResult('createUser');
});
const mockUpdateUserMutation = jest.fn(options => {
  mockMutationOptions.updateUser = options;
  return mockMutationResult('updateUser');
});

const mockReadData = {
  action: 'G0 X1',
  commands: 'G0 X1',
  enabled: true,
  name: 'Fixture name',
  title: 'Fixture user',
  trigger: 'manual',
};
const mockReadQuery = jest.fn(() => ({ data: mockReadData, isError: false, isFetching: false }));

jest.mock('@app/hooks/useToast', () => ({
  __esModule: true,
  default: (...args) => mockUseToast(...args),
}));

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: { _: value => value },
}));

jest.mock('../Commands/queries', () => ({
  API_COMMANDS_QUERY_KEY: ['api/commands'],
  useCreateCommandMutation: (...args) => mockCreateCommandMutation(...args),
  useReadCommandQuery: (...args) => mockReadQuery(...args),
  useUpdateCommandMutation: (...args) => mockUpdateCommandMutation(...args),
}));

jest.mock('../Events/queries', () => ({
  API_EVENTS_QUERY_KEY: ['api/events'],
  useCreateEventMutation: (...args) => mockCreateEventMutation(...args),
  useReadEventQuery: (...args) => mockReadQuery(...args),
  useUpdateEventMutation: (...args) => mockUpdateEventMutation(...args),
}));

jest.mock('../Machines/queries', () => ({
  API_MACHINES_QUERY_KEY: ['api/machines'],
  useCreateMachineMutation: (...args) => mockCreateMachineMutation(...args),
  useReadMachineQuery: (...args) => mockReadQuery(...args),
  useUpdateMachineMutation: (...args) => mockUpdateMachineMutation(...args),
}));

jest.mock('@app/queries/macros', () => ({
  useCreateMacroMutation: (...args) => mockCreateMacroMutation(...args),
  useReadMacroQuery: (...args) => mockReadQuery(...args),
  useUpdateMacroMutation: (...args) => mockUpdateMacroMutation(...args),
}));

jest.mock('../Users/queries', () => ({
  API_USERS_QUERY_KEY: ['api/users'],
  useCreateUserMutation: (...args) => mockCreateUserMutation(...args),
  useReadUserQuery: (...args) => mockReadQuery(...args),
  useUpdateUserMutation: (...args) => mockUpdateUserMutation(...args),
}));

const drawerCases = [
  ['CreateCommandDrawer', require('../Commands/drawers/CreateCommandDrawer').default, 'createCommand', false, 'Add', ['Command name:', 'Command action:']],
  ['UpdateCommandDrawer', require('../Commands/drawers/UpdateCommandDrawer').default, 'updateCommand', true, 'Save', ['Command name:', 'Command action:']],
  ['CreateEventDrawer', require('../Events/drawers/CreateEventDrawer').default, 'createEvent', false, 'Add', ['Event name:', 'Event trigger:', 'Event action:']],
  ['UpdateEventDrawer', require('../Events/drawers/UpdateEventDrawer').default, 'updateEvent', true, 'Save', ['Event name:', 'Event trigger:', 'Event action:']],
  ['CreateMachineDrawer', require('../Machines/drawers/CreateMachineDrawer').default, 'createMachine', false, 'Add', ['Machine name:', 'X min', 'X max', 'Y min', 'Y max', 'Z min', 'Z max']],
  ['UpdateMachineDrawer', require('../Machines/drawers/UpdateMachineDrawer').default, 'updateMachine', true, 'Save', ['Machine name:', 'X min', 'X max', 'Y min', 'Y max', 'Z min', 'Z max']],
  ['CreateMacroDrawer', require('../Macros/drawers/CreateMacroDrawer').default, 'createMacro', false, 'Add', ['Macro name:', 'G-code commands:']],
  ['UpdateMacroDrawer', require('../Macros/drawers/UpdateMacroDrawer').default, 'updateMacro', true, 'Save', ['Macro name:', 'G-code commands:']],
  ['CreateUserDrawer', require('../Users/drawers/CreateUserDrawer').default, 'createUser', false, 'Add', ['User name:', 'Password:']],
  ['UpdateUserDrawer', require('../Users/drawers/UpdateUserDrawer').default, 'updateUser', true, 'Save', ['User name:']],
];

const mutationMocks = [
  mockCreateCommandMutation,
  mockUpdateCommandMutation,
  mockCreateEventMutation,
  mockUpdateEventMutation,
  mockCreateMachineMutation,
  mockUpdateMachineMutation,
  mockCreateMacroMutation,
  mockUpdateMacroMutation,
  mockCreateUserMutation,
  mockUpdateUserMutation,
];

const mutationMocksByKey = {
  createCommand: mockCreateCommandMutation,
  updateCommand: mockUpdateCommandMutation,
  createEvent: mockCreateEventMutation,
  updateEvent: mockUpdateEventMutation,
  createMachine: mockCreateMachineMutation,
  updateMachine: mockUpdateMachineMutation,
  createMacro: mockCreateMacroMutation,
  updateMacro: mockUpdateMacroMutation,
  createUser: mockCreateUserMutation,
  updateUser: mockUpdateUserMutation,
};

const getLatestMutation = (mutationKey) => {
  const results = mutationMocksByKey[mutationKey].mock.results;
  return results[results.length - 1].value.mutate;
};

beforeEach(() => {
  mockNotifyToast.mockClear();
  mockUseToast.mockClear();
  mockReadQuery.mockClear();
  mutationMocks.forEach(mock => mock.mockClear());
  Object.keys(mockMutationResults).forEach(key => {
    delete mockMutationResults[key];
  });
  Object.keys(mockMutationOptions).forEach(key => {
    delete mockMutationOptions[key];
  });
});

test('Administration drawers route mutation failures to the global persistent toast', () => {
  drawerCases.forEach(([name, Drawer, mutationKey, isUpdate]) => {
    const view = renderAppUI(
      <Drawer
        id={isUpdate ? 'fixture-id' : undefined}
        onClose={jest.fn()}
      />
    );

    try {
      expect(mockMutationOptions[mutationKey]).toBeDefined();
      mockMutationOptions[mutationKey].onError(new Error(`${name} failed`));
    } finally {
      view.dispose();
    }
  });

  expect(mockNotifyToast).toHaveBeenCalledTimes(10);
  mockNotifyToast.mock.calls.forEach(([options]) => {
    expect(options.appearance).toBe('error');
    expect(options.duration).toBeUndefined();
    expect(options.content.props.children).toBe('An unexpected error has occurred.');
  });
});

test.each(drawerCases)(
  '%s links every required error and blocks invalid keyboard submission',
  async (name, Drawer, mutationKey, isUpdate, submitLabel, fieldLabels) => {
    const user = userEvent.setup();
    const view = renderAppUI(
      <Drawer
        id={isUpdate ? 'fixture-id' : undefined}
        onClose={jest.fn()}
      />
    );

    try {
      const fields = fieldLabels.map(label => screen.getByLabelText(new RegExp(`^${label}`)));
      await fields.reduce(
        (promise, field) => promise.then(() => user.clear(field)),
        Promise.resolve()
      );

      const submit = screen.getByRole('button', { name: submitLabel });
      submit.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => fields.forEach((field) => {
        const describedBy = field.getAttribute('aria-describedby');
        const associatedError = describedBy
          .split(/\s+/)
          .map(id => document.getElementById(id))
          .find(element => element && element.getAttribute('role') === 'alert');

        expect(associatedError).toHaveTextContent(/\S/);
      }));
      expect(getLatestMutation(mutationKey)).not.toHaveBeenCalled();
    } finally {
      view.dispose();
    }
  }
);

test.each(drawerCases)(
  '%s accepts keyboard-only field entry and primary-button submission',
  async (name, Drawer, mutationKey, isUpdate, submitLabel, fieldLabels) => {
    const user = userEvent.setup();
    const view = renderAppUI(
      <Drawer
        id={isUpdate ? 'fixture-id' : undefined}
        onClose={jest.fn()}
      />
    );

    try {
      const fields = fieldLabels.map(label => screen.getByLabelText(new RegExp(`^${label}`)));
      await fields.reduce(
        (promise, field, index) => promise
          .then(() => user.clear(field))
          .then(() => user.type(
            field,
            name.includes('MachineDrawer') && index > 0 ? `${index}` : `value-${index + 1}`,
          )),
        Promise.resolve()
      );

      const submit = screen.getByRole('button', { name: submitLabel });
      submit.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => expect(getLatestMutation(mutationKey)).toHaveBeenCalledTimes(1));
    } finally {
      view.dispose();
    }
  }
);

test.each(drawerCases.filter(([name]) => name.includes('MacroDrawer')))(
  '%s variable menu uses one button and inserts a variable by keyboard',
  async (name, Drawer, mutationKey, isUpdate) => {
    const user = userEvent.setup();
    const view = renderAppUI(<Drawer id={isUpdate ? 'fixture-id' : undefined} onClose={jest.fn()} />);
    try {
      expect(document.querySelector('button button')).toBeNull();
      const commands = screen.getByLabelText(/^G-code commands:/);
      await user.clear(commands);
      await user.click(screen.getByRole('button', { name: isUpdate ? 'Save' : 'Add' }));
      await waitFor(() => expect(commands).toHaveAttribute('aria-invalid', 'true'));
      screen.getByRole('button', { name: 'Select variables' }).focus();
      await user.keyboard('{Enter}');
      const variable = await screen.findByRole('menuitem', { name: '%wait', exact: true });
      variable.focus();
      await user.keyboard('{Enter}');
      expect(commands).toHaveValue('%wait');
      await waitFor(() => expect(commands).not.toHaveAttribute('aria-invalid', 'true'));
      screen.getByRole('button', { name: 'Select variables' }).focus();
      await user.keyboard(' ');
      const position = await screen.findByRole('menuitem', { name: '[posx]', exact: true });
      position.focus();
      await user.keyboard(' ');
      expect(commands).toHaveValue('%wait[posx]');
      expect(getLatestMutation(mutationKey)).not.toHaveBeenCalled();
    } finally {
      view.dispose();
    }
  }
);

test.each(drawerCases.filter(([name]) => name.includes('MachineDrawer')))(
  '%s clears paired-limit errors when only the lower bounds are corrected',
  async (name, Drawer, mutationKey, isUpdate, submitLabel) => {
    const user = userEvent.setup();
    const view = renderAppUI(<Drawer id={isUpdate ? 'fixture-id' : undefined} onClose={jest.fn()} />);
    try {
      const axes = ['X', 'Y', 'Z'];
      await axes.reduce((promise, axis) => promise.then(async () => {
        const min = screen.getByLabelText(new RegExp(`^${axis} min`));
        const max = screen.getByLabelText(new RegExp(`^${axis} max`));
        await user.clear(min);
        await user.type(min, '10');
        await user.clear(max);
        await user.type(max, '5');
        expect(max).not.toHaveAttribute('aria-invalid', 'true');
      }), Promise.resolve());
      await user.click(screen.getByRole('button', { name: submitLabel }));
      await waitFor(() => axes.forEach(axis => {
        expect(screen.getByLabelText(new RegExp(`^${axis} max`))).toHaveAttribute('aria-invalid', 'true');
      }));
      expect(getLatestMutation(mutationKey)).not.toHaveBeenCalled();
      await axes.reduce((promise, axis) => promise.then(async () => {
        const min = screen.getByLabelText(new RegExp(`^${axis} min`));
        await user.clear(min);
        await user.type(min, '0');
        await waitFor(() => expect(screen.getByLabelText(new RegExp(`^${axis} max`))).not.toHaveAttribute('aria-invalid', 'true'));
      }), Promise.resolve());
    } finally {
      view.dispose();
    }
  }
);
