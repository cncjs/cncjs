import { useMemo } from 'react';
import PathWidget from '../widgets/PathWidget';
import { useFooterContent } from '../ui/footerSlot';
import { NO_READING } from '../machine/readings';
import { readToolpath } from '../machine/toolpath';

/**
 * The toolpath, and nothing beside it.
 *
 * One layout rather than two. Every other screen has a phone shape because a
 * phone can reach it; this one is not on the tab bar — a drawing read at
 * arm's length to check a program before starting it is panel work, and a
 * second layout for a screen nothing navigates to would be a layout nobody
 * ever looked at.
 *
 * So the card gets the whole frame. The toolpath is the only subject here and
 * a dashboard tile beside it would be taking room from the one thing the
 * screen is for.
 */
const extent = (bounds, axis) => (
  bounds ? (bounds.max[axis] - bounds.min[axis]).toFixed(1) : NO_READING
);

const PathScreen = ({ machine }) => {
  /*
   * How big the part is, in the status bar rather than on the drawing.
   *
   * It is the first thing anyone checks a program for and it is three
   * numbers, which is exactly what a strip is good for. On the drawing it
   * would need a leader line to each axis and would be in the way of the
   * thing being measured.
   *
   * Parsed a second time here rather than lifted out of the widget, and
   * memoised on the same key. The program changes about once an hour and the
   * readings four times a second, so without the memo this would re-parse a
   * whole program every status report — and threading the widget's copy up
   * through the screen would put the widget's state in the screen for the
   * sake of three numbers.
   */
  const toolpath = useMemo(() => readToolpath(machine.gcode), [machine.gcode]);
  const bounds = toolpath?.bounds;

  useFooterContent(machine.job
? null
: () => (
    <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 font-num text-base leading-tight text-mut">
      <span>program · <span className="text-ink">{toolpath ? toolpath.name : NO_READING}</span></span>
      <span>
        wymiary · <span className="text-ink">{extent(bounds, 'x')}</span>
        {' × '}<span className="text-ink">{extent(bounds, 'y')}</span>
        {' × '}<span className="text-ink">{extent(bounds, 'z')}</span> mm
      </span>
      <span>układ · <span className="text-ink">{machine.modal.wcs || NO_READING}</span></span>
    </span>
  ), [
    Boolean(machine.job),
    machine.gcode,
    machine.modal.wcs,
  ]);

  return <PathWidget machine={machine} className="min-h-0 flex-1" />;
};

export default PathScreen;
