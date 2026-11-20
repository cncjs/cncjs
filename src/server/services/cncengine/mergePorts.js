const mergePorts = (detectedPorts, configuredPorts) => {
  // Configured entries override metadata while preserving first-seen path order.
  const portsByPath = new Map();
  detectedPorts.forEach(port => portsByPath.set(port.path, port));
  configuredPorts.forEach(port => {
    const existingPort = portsByPath.get(port.path);
    portsByPath.set(port.path, existingPort ? Object.assign({}, existingPort, port) : port);
  });
  return Array.from(portsByPath.values());
};

export default mergePorts;
