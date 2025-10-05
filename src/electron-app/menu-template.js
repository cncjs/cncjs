export const createApplicationMenuTemplate = (options) => {
  const menuTemplate = (process.platform === 'darwin')
    ? require('./menu-template.darwin').default
    : require('./menu-template.default').default;
  return menuTemplate(options);
};

export const selectionMenuTemplate = [
  { role: 'copy' },
  { type: 'separator' },
  { role: 'selectall' },
];

export const inputMenuTemplate = [
  { role: 'undo' },
  { role: 'redo' },
  { type: 'separator' },
  { role: 'cut' },
  { role: 'copy' },
  { role: 'paste' },
  { type: 'separator' },
  { role: 'selectall' },
];
