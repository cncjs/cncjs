// Add a dummy i18n object to make sure text strings will be extracted by i18next-scanner
const i18n = {
  _: x => x,
};

const routes = [
  {
    icon: 'xyz',
    key: 'workspace',
    path: '/workspace',
    title: i18n._('Workspace'),
  },
  {
    icon: 'gears',
    key: 'settings',
    path: '/administration',
    title: i18n._('Settings'),
    routes: [
      {
        key: 'settings/general',
        path: '/administration/general',
        title: i18n._('General'),
      },
      {
        key: 'settings/workspace',
        path: '/administration/workspace',
        title: i18n._('Workspace'),
      },
      {
        key: 'settings/controller',
        path: '/administration/controller',
        title: i18n._('Controller'),
      },
      {
        key: 'settings/machine-profiles',
        path: '/administration/machine-profiles',
        title: i18n._('Machine Profiles'),
      },
      {
        key: 'settings/user-accounts',
        path: '/administration/user-accounts',
        title: i18n._('User Accounts'),
      },
      {
        key: 'settings/commands',
        path: '/administration/commands',
        title: i18n._('Commands'),
      },
      {
        key: 'settings/events',
        path: '/administration/events',
        title: i18n._('Events'),
      },
      {
        key: 'settings/about',
        path: '/administration/about',
        title: i18n._('About'),
      },
    ],
  },
];

export default routes;
