import trimEnd from 'lodash/trimEnd';

// Helpers for the console's single-row input line.

// Characters of command text that fit on one row (the prompt takes part of it)
export const getInputCapacity = (cols, promptLength) => Math.max(0, cols - promptLength - 1);

export const fitsOnRow = (command, cols, promptLength) => (
  String(command).length <= getInputCapacity(cols, promptLength)
);

// Read the command from the row that holds the prompt.
//   { ok: true, command }   a complete, visible command
//   { ok: false, reason }   sending the row could send something other than what the user sees
// `cells` is the xterm line (an array of [attr, char, width]); `isWrapped` is its wrap flag.
export const readInputLine = ({ cells, isWrapped, cols, prompt }) => {
  if (isWrapped) {
    return { ok: false, reason: 'wrapped' };
  }
  for (let i = 0; i < prompt.length; ++i) {
    if (!cells[i] || cells[i][1] !== prompt[i]) {
      return { ok: false, reason: 'prompt-missing' };
    }
  }
  let command = '';
  for (let x = prompt.length; x < cells.length; ++x) {
    const ch = (cells[x] && cells[x][1]) || '';
    if (x >= cols) {
      if (ch.trim()) {
        return { ok: false, reason: 'hidden' };
      }
    } else {
      command += ch;
    }
  }
  return { ok: true, command: trimEnd(command) };
};

// A narrower terminal must not hide a command that is being typed: never go below the width it needs.
// `pendingExtent` is the prompt plus the typed text; growing is always allowed.
export const colsKeepingPendingInput = (requestedCols, pendingExtent, currentCols) => (
  requestedCols < currentCols ? Math.max(requestedCols, pendingExtent + 1) : requestedCols
);
