import i18n from 'app/lib/i18n';

const routes = [
  {
    icon: 'xyz',
    key: 'workspace',
    path: '/workspace',
  },
  {
    icon: 'gears',
    key: 'settings',
    path: '/administration',
    routes: [
      {
        key: 'settings/general',
        path: '/administration/general',
      },
      {
        key: 'settings/workspace',
        path: '/administration/workspace',
      },
      {
        key: 'settings/controller',
        path: '/administration/controller',
      },
      {
        key: 'settings/machine-profiles',
        path: '/administration/machine-profiles',
      },
      {
        key: 'settings/user-accounts',
        path: '/administration/user-accounts',
      },
      {
        key: 'settings/commands',
        path: '/administration/commands',
      },
      {
        key: 'settings/events',
        path: '/administration/events',
      },
      {
        key: 'settings/about',
        path: '/administration/about',
      },
    ],
  },
];

const mapRoutePathToPageTitle = (path) => ({
  '/workspace': i18n._('Workspace'),
  '/administration': i18n._('Settings'),
  '/administration/general': i18n._('General'),
  '/administration/workspace': i18n._('Workspace'),
  '/administration/machine-profiles': i18n._('Machine Profiles'),
  '/administration/user-accounts': i18n._('User Accounts'),
  '/administration/controller': i18n._('Controller'),
  '/administration/commands': i18n._('Commands'),
  '/administration/events': i18n._('Events'),
  '/administration/about': i18n._('About'),
})[path] || '';

export {
  routes,
  mapRoutePathToPageTitle,
};
