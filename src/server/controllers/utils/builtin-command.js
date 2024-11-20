import { ensureString } from 'ensure-type';
import {
  BUILTIN_COMMAND_MSG,
  BUILTIN_COMMAND_WAIT,
} from '../constants';

export const match = (line) => {
  const cmds = [BUILTIN_COMMAND_MSG, BUILTIN_COMMAND_WAIT];
  const re = new RegExp(`^(${cmds.join('|')})\\b`, 'i');
  const match = line.match(re);
  if (!match) {
    return null;
  }
  return ensureString(match?.[1]).toLowerCase();
};
