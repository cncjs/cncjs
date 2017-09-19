export default (options) => {
    const menuTemplate = (process.platform === 'darwin')
        ? require('./menu-template.darwin').default
        : require('./menu-template.default').default;

    return menuTemplate(options);
};
