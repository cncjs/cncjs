const variables = [
  {
    role: 'group',
    title: 'Wait until the planner queue is empty',
    children: [
      {
        role: 'menuitem',
        value: '%wait\n',
      },
    ],
  },
  {
    role: 'group',
    title: 'User-defined global variables',
    children: [
      {
        role: 'menuitem',
        value: '%global.tool = Number(tool) || 0\n',
      },
    ],
  },
  {
    role: 'group',
    title: 'Display a global variable using an inline comment',
    children: [
      {
        role: 'menuitem',
        value: '(tool=[global.tool])\n',
      },
    ],
  },
  {
    role: 'group',
    title: 'Keep a backup of current work position',
    children: [
      {
        role: 'menuitem',
        value: '%X0=posx,Y0=posy,Z0=posz\n',
      }
    ],
  },
  {
    role: 'group',
    title: 'Go to previous work position',
    children: [
      {
        role: 'menuitem',
        value: 'G0 X[X0] Y[Y0]\n',
      },
      {
        role: 'menuitem',
        value: 'G0 Z[Z0]\n',
      },
    ],
  },
  {
    role: 'group',
    title: 'Tool change',
    children: [
      {
        role: 'menuitem',
        value: '%prevTool = Number(global.tool) || 0, global.tool = tool\n',
      },
    ],
  },
  {
    role: 'group',
    title: 'Save modal state',
    children: [
      {
        role: 'menuitem',
        value: '%WCS=modal.wcs\n',
      },
      {
        role: 'menuitem',
        value: '%PLANE=modal.plane\n',
      },
      {
        role: 'menuitem',
        value: '%UNITS=modal.units\n',
      },
      {
        role: 'menuitem',
        value: '%DISTANCE=modal.distance\n',
      },
      {
        role: 'menuitem',
        value: '%FEEDRATE=modal.feedrate\n',
      },
      {
        role: 'menuitem',
        value: '%SPINDLE=modal.spindle\n',
      },
      {
        role: 'menuitem',
        value: '%COOLANT=modal.coolant\n',
      },
    ],
  },
  {
    role: 'group',
    title: 'Restore modal state',
    children: [
      {
        role: 'menuitem',
        value: '[WCS] [PLANE] [UNITS] [DISTANCE] [FEEDRATE] [SPINDLE] [COOLANT]\n',
      },
    ],
  },
  {
    role: 'group',
    title: 'Current work position',
    children: [
      {
        role: 'menuitem',
        value: '[posx]',
      },
      {
        role: 'menuitem',
        value: '[posy]',
      },
      {
        role: 'menuitem',
        value: '[posz]',
      },
      {
        role: 'menuitem',
        value: '[posa]',
      },
    ],
  },
  {
    role: 'group',
    title: 'Set bounding box',
    children: [
      {
        role: 'menuitem',
        value: '%xmin=0,xmax=100,ymin=0,ymax=100,zmin=0,zmax=50\n',
      },
    ],
  },
  {
    role: 'group',
    title: 'Bounding box',
    children: [
      {
        role: 'menuitem',
        value: '[xmin]',
      },
      {
        role: 'menuitem',
        value: '[xmax]',
      },
      {
        role: 'menuitem',
        value: '[ymin]',
      },
      {
        role: 'menuitem',
        value: '[ymax]',
      },
      {
        role: 'menuitem',
        value: '[zmin]',
      },
      {
        role: 'menuitem',
        value: '[zmax]',
      },
    ],
  },
];

export default variables;
