// Keep controller notifications tied to their source without changing their payloads.
export default (socket, controller) => {
  const port = controller.options.port;
  const opening = !controller.isOpen();
  let attached = false;

  return {
    id: socket.id,
    emit: (event, ...args) => {
      if (event === 'feeder:status') {
        if (attached) {
          socket.emit(event, ...args, port);
        }
        return;
      }
      socket.emit(event, ...args);
      if (event === 'serialport:open') {
        attached = true;
        // addConnection snapshots precede open for a newly created controller.
        // Send its current status after attachment instead of replaying that snapshot.
        if (opening) {
          socket.emit('feeder:status', controller.feeder.toJSON(), port);
        }
      }
      if (event === 'serialport:close') {
        attached = false;
      }
    }
  };
};
