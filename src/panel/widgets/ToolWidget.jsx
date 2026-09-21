import Card from '../ui/Card';
import OverrideBar from '../ui/OverrideBar';
import StatTile from '../ui/StatTile';
import { NO_READING } from '../machine/readings';

const reading = (value) => (value === null || value === undefined ? NO_READING : value);

/**
 * What is in the spindle, how fast it is turning, and how hard the operator
 * is leaning on the job.
 *
 * The two readings and the two overrides belong together because they are one
 * question asked from two sides: is this cutting the way it should. Splitting
 * them across widgets means checking the tool in one place and the feed
 * override in another while the cutter is in the work.
 */
const ToolWidget = ({ machine, label = 'Narzędzie i wrzeciono', className = '', children }) => {
  const { tool, overrides } = machine;

  return (
    <Card label={label} className={`@container min-w-0 ${className}`} bodyClassName="gap-gap">
      <div className="flex flex-col gap-gap @sm:flex-row">
        <StatTile label="narzędzie" value={tool.tool ? `T${tool.tool}` : NO_READING} />
        <StatTile label="obroty" value={reading(tool.spindle)} unit="rpm" />
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-cap font-semibold uppercase tracking-[0.1em] text-mut">Korekta</span>
        <OverrideBar label="posuw" percent={overrides.feed} />
        <OverrideBar label="wrzeciono" percent={overrides.spindle} />
      </div>

      {children ? <div className="mt-auto">{children}</div> : null}
    </Card>
  );
};

export default ToolWidget;
