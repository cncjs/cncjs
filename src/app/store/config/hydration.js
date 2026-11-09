export const hydrateConfig = async ({
  config,
  read,
  onParsed = () => {},
  normalize,
  migrate,
  onError = () => {},
}) => {
  try {
    const { version, state } = JSON.parse(await read());
    onParsed({ version, state });
    config.state = normalize(state);

    if (version) {
      migrate();
    }

    config.emit('change', config.get());
    return true;
  } catch (error) {
    onError(error);
    return false;
  }
};
