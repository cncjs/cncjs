export const MACRO_VARIABLE_EXAMPLES = [
  {
    title: 'Wait until the planner queue is empty',
    data: [
      '%wait\n',
    ],
  },
  {
    title: 'User-defined global variables',
    data: [
      '%global.tool = Number(tool) || 0\n',
    ],
  },
  {
    title: 'Display a global variable using an inline comment',
    data: [
      '(tool=[global.tool])\n',
    ],
  },
  {
    title: 'Keep a backup of current work position',
    data: [
      '%X0=posx,Y0=posy,Z0=posz\n',
    ],
  },
  {
    title: 'Go to previous work position',
    data: [
      'G0 X[X0] Y[Y0]\n',
      'G0 Z[Z0]\n',
    ],
  },
  {
    title: 'Tool change',
    data: [
      '%prevTool = Number(global.tool) || 0, global.tool = tool\n',
    ],
  },
  {
    title: 'Save modal state',
    data: [
      '%WCS=modal.wcs\n',
      '%PLANE=modal.plane\n',
      '%UNITS=modal.units\n',
      '%DISTANCE=modal.distance\n',
      '%FEEDRATE=modal.feedrate\n',
      '%SPINDLE=modal.spindle\n',
      '%COOLANT=modal.coolant\n',
    ],
  },
  {
    title: 'Restore modal state',
    data: [
      '[WCS] [PLANE] [UNITS] [DISTANCE] [FEEDRATE] [SPINDLE] [COOLANT]\n',
    ],
  },
  {
    title: 'Current work position',
    data: [
      '[posx]',
      '[posy]',
      '[posz]',
      '[posa]',
    ],
  },
  {
    title: 'Set bounding box',
    data: [
      '%xmin=0,xmax=100,ymin=0,ymax=100,zmin=0,zmax=50\n',
    ],
  },
  {
    title: 'Bounding box',
    data: [
      '[xmin]',
      '[xmax]',
      '[ymin]',
      '[ymax]',
      '[zmin]',
      '[zmax]',
    ],
  },
];
