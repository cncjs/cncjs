import { ensureString } from 'ensure-type';
import {
  BUILTIN_COMMAND_MSG,
  BUILTIN_COMMAND_WAIT,
} from '../constants';

export const match = (line) => {
  // Strip anything after a semi-colon to the end of the line
  const strippedLine = ensureString(line).replace(/;.*$/, '').trim();
  const cmds = [BUILTIN_COMMAND_MSG, BUILTIN_COMMAND_WAIT];
  const re = new RegExp(`^(${cmds.join('|')})\\b`, 'i');
  const match = strippedLine.match(re);
  if (!match) {
    return null;
  }
  const command = ensureString(match[1]).toLowerCase();
  const rest = strippedLine.slice(match[0].length).trim();
  return [command, rest];
};
