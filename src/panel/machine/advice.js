/**
 * What to do about the state the machine is in.
 *
 * The panel has always been able to say *what* is wrong — `Rozłączony`,
 * `Brak serwera`, `Alarm` — and never what to do about it. That is most of
 * the value: a pendant picked up in a garage is held by somebody who wants
 * the next step, not a diagnosis.
 *
 * Here rather than in the sheet that shows it, because this is a decision
 * about the machine and the sheet is a layout. This tier runs under Jest with
 * no browser, so it names a key and stops; the words are found where they are
 * drawn.
 *
 * Returns `null` when there is nothing to advise, which is the ordinary case
 * — a machine that is answering and will take a command needs no advice, and
 * a sheet that always had something to say would train people to ignore it.
 */

/** Which advice, and whether the connection screen is where it is acted on. */
export const adviceFor = ({ linked, connected, port, canSendGcode } = {}) => {
  // No server at all. The connection screen still helps — it is the one place
  // that shows which host the panel is pointed at, which is usually the
  // answer when a pendant cannot find its machine.
  if (!linked) {
    return { key: 'advice.noServer', go: true };
  }

  // A port is open and the socket has not attached yet. Real time, not an
  // error, and the only correct advice is to wait.
  if (port && !connected) {
    return { key: 'advice.attaching', go: false };
  }

  if (!connected) {
    return { key: 'advice.noPort', go: true };
  }

  /*
   * Connected, and the server will not send. That is alarm, and it is the
   * one state where every control that writes is dead while everything on
   * screen looks alive — see `readings.canSendGcode`.
   *
   * No `go`: the connection screen cannot clear an alarm, and the panel does
   * not clear it either. Homing or unlocking is the operator's to do.
   */
  if (!canSendGcode) {
    return { key: 'advice.alarm', go: false };
  }

  return null;
};

export default adviceFor;
