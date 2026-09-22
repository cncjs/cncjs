import Card from '../ui/Card';
import OverrideBar from '../ui/OverrideBar';
import StatTile from '../ui/StatTile';
import { NO_READING } from '../machine/readings';
import { t } from '../i18n';

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
const ToolWidget = ({ machine, label = t('tool.title'), className = '', children }) => {
  const { tool, overrides } = machine;

  return (
    <Card label={label} className={`@container min-w-0 ${className}`} bodyClassName="gap-gap">
      <div className="flex flex-col gap-gap @sm:flex-row">
        <StatTile label={t('tool.tool')} value={tool.tool ? t('tool.number', { number: tool.tool }) : NO_READING} />
        <StatTile label={t('tool.spindle')} value={reading(tool.spindle)} unit={t('units.rpm')} />
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-cap font-semibold uppercase tracking-[0.1em] text-mut">{t('tool.override')}</span>
        <OverrideBar label={t('tool.feedOverride')} percent={overrides.feed} />
        <OverrideBar label={t('tool.spindleOverride')} percent={overrides.spindle} />
      </div>

      {children ? <div className="mt-auto">{children}</div> : null}
    </Card>
  );
};

export default ToolWidget;
