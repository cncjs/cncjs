import {
  CallbackIcon,
  CaretSquareRightIcon,
  GearsIcon,
  SettingsIcon,
  TerminalIcon,
  ToolsConfigurationIcon,
  UserManagedIcon,
  WidgetsIcon,
  WorkspaceIcon,
} from '@tonic-ui/react-icons';
import i18n from '@app/lib/i18n';

const routes = [
  {
    icon: WidgetsIcon,
    key: 'workspace',
    path: '/workspace',
  },
  {
    icon: GearsIcon,
    key: 'administration',
    path: '/administration',
    routes: [
      {
        icon: SettingsIcon,
        key: 'administration/general-settings',
        path: '/administration/general-settings',
      },
      {
        icon: WorkspaceIcon,
        key: 'administration/workspace-settings',
        path: '/administration/workspace-settings',
      },
      {
        icon: ToolsConfigurationIcon,
        key: 'administration/machine-profiles',
        path: '/administration/machine-profiles',
      },
      {
        divider: true,
      },
      {
        icon: CaretSquareRightIcon,
        key: 'administration/macros',
        path: '/administration/macros',
      },
      {
        icon: TerminalIcon,
        key: 'administration/commands',
        path: '/administration/commands',
      },
      {
        icon: CallbackIcon,
        key: 'administration/events',
        path: '/administration/events',
      },
      {
        divider: true,
      },
      {
        icon: UserManagedIcon,
        key: 'administration/user-accounts',
        path: '/administration/user-accounts',
      },
    ],
  },
  {
    hidden: true,
    key: 'about',
    path: '/about',
  },
];

const mapRoutePathToPageTitle = (path) => ({
  '/about': i18n._('About'),
  '/administration': i18n._('Administration'),
  '/administration/commands': i18n._('Commands'),
  '/administration/events': i18n._('Events'),
  '/administration/general-settings': i18n._('General Settings'),
  '/administration/machine-profiles': i18n._('Machine Profiles'),
  '/administration/macros': i18n._('Macros'),
  '/administration/user-accounts': i18n._('User Accounts'),
  '/administration/workspace-settings': i18n._('Workspace Settings'),
  '/workspace': i18n._('Workspace'),
})[path] || '';

export {
  routes,
  mapRoutePathToPageTitle,
};
