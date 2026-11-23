import trimEnd from 'lodash/trimEnd';

export const getInputCapacity = (cols, promptLength) => Math.max(0, cols - promptLength - 1);
export const fitsOnRow = (command, cols, promptLength) => String(command).length <= getInputCapacity(cols, promptLength);

// xterm 4 buffer lines expose text and wrapping separately. Never submit a partial row.
export const readInputLine = ({ line, cols, prompt }) => {
  if (!line || line.isWrapped) {
    return { ok: false };
  }
  const text = line.translateToString();
  const command = trimEnd(text.slice(prompt.length));
  if (!text.startsWith(prompt) || !fitsOnRow(command, cols, prompt.length)) {
    return { ok: false };
  }
  return { ok: true, command };
};

export const colsKeepingPendingInput = (requestedCols, pendingExtent, currentCols) => (
  requestedCols < currentCols ? Math.max(requestedCols, pendingExtent + 1) : requestedCols
);
