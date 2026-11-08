/**
 * Registers Axes controller and global hotkey callbacks as one lifecycle
 * resource. The returned cleanup uses the same callback identities.
 * @param {{ controller: object, combokeys: object, controllerEvents: object, shuttleControlEvents: object, shuttleControl: object }} resources
 * @returns {() => void}
 */
export const subscribeAxesEvents = ({
  controller,
  combokeys,
  controllerEvents,
  shuttleControlEvents,
  shuttleControl,
}) => {
  Object.entries(controllerEvents).forEach(([eventName, callback]) => {
    controller.addListener(eventName, callback);
  });
  Object.entries(shuttleControlEvents).forEach(([eventName, callback]) => {
    combokeys.on(eventName, callback);
  });

  return () => {
    Object.entries(controllerEvents).forEach(([eventName, callback]) => {
      controller.removeListener(eventName, callback);
    });
    Object.entries(shuttleControlEvents).forEach(([eventName, callback]) => {
      combokeys.removeListener(eventName, callback);
    });
    shuttleControl.clear();
    shuttleControl.removeAllListeners('flush');
  };
};
