export const MACRO_VARIABLE_EXAMPLES = [
  {
    title: 'Wait until the planner queue is empty',
    data: [
      '%wait',
    ],
  },
  {
    title: 'User-defined global variables',
    data: [
      '%global.tool = Number(tool) || 0',
    ],
  },
  {
    title: 'Display a global variable using an inline comment',
    data: [
      '(tool=[global.tool])',
    ],
  },
  {
    title: 'Keep a backup of current work position',
    data: [
      '%X0=posx,Y0=posy,Z0=posz',
    ],
  },
  {
    title: 'Go to previous work position',
    data: [
      'G0 X[X0] Y[Y0]',
      'G0 Z[Z0]',
    ],
  },
  {
    title: 'Tool change',
    data: [
      '%prevTool = Number(global.tool) || 0, global.tool = tool',
    ],
  },
  {
    title: 'Save modal state',
    data: [
      '%WCS=modal.wcs',
      '%PLANE=modal.plane',
      '%UNITS=modal.units',
      '%DISTANCE=modal.distance',
      '%FEEDRATE=modal.feedrate',
      '%SPINDLE=modal.spindle',
      '%COOLANT=modal.coolant',
    ],
  },
  {
    title: 'Restore modal state',
    data: [
      '[WCS] [PLANE] [UNITS] [DISTANCE] [FEEDRATE] [SPINDLE] [COOLANT]',
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
      '%xmin=0,xmax=100,ymin=0,ymax=100,zmin=0,zmax=50',
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
