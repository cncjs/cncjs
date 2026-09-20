import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';

/**
 * The commands this panel can send to a Grbl, as data.
 *
 * They live with the feature rather than with whatever draws the menu,
 * because what `$X` means is machine knowledge and a dropdown is not. Move the
 * panel somewhere else and the list goes with it.
 *
 * A function rather than a constant so the labels are translated when they are
 * shown, not when this module is first imported — the language can change
 * while the application is running.
 *
 * The first group acts on the machine and the second only asks it questions.
 * That is what the divider is: everything above it can move a tool or drop a
 * lock, and everything below it writes a line to the console.
 */
export const grblCommands = () => [
  { id: 'status', label: i18n._('Status Report (?)'), run: () => controller.write('?') },
  { id: 'check', label: i18n._('Check G-code Mode ($C)'), run: () => controller.writeln('$C') },
  { id: 'homing', label: i18n._('Homing ($H)'), run: () => controller.command('homing') },
  { id: 'unlock', label: i18n._('Kill Alarm Lock ($X)'), run: () => controller.command('unlock') },
  { id: 'sleep', label: i18n._('Sleep ($SLP)'), run: () => controller.command('sleep') },
  { id: 'divider', divider: true },
  { id: 'help', label: i18n._('Help ($)'), run: () => controller.writeln('$') },
  { id: 'settings', label: i18n._('Settings ($$)'), run: () => controller.writeln('$$') },
  { id: 'parameters', label: i18n._('View G-code Parameters ($#)'), run: () => controller.writeln('$#') },
  { id: 'parserState', label: i18n._('View G-code Parser State ($G)'), run: () => controller.writeln('$G') },
  { id: 'buildInfo', label: i18n._('View Build Info ($I)'), run: () => controller.writeln('$I') },
  { id: 'startupBlocks', label: i18n._('View Startup Blocks ($N)'), run: () => controller.writeln('$N') },
];

/** Ask the controller to restate its parameters and settings. */
export const refreshSettings = () => {
  controller.writeln('$#');
  controller.writeln('$$');
};
