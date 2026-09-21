import JobStatusLine from './JobStatusLine';

/**
 * The line along the bottom, and it belongs to one thing at a time.
 *
 * A screen fills it or it does not; there is no arrangement where half of it
 * is the jog screen's facts and the other half the job's buttons. Two subjects
 * on one strip is a strip nobody can read at a glance, which is the only way
 * this one is ever read.
 *
 * The job is the default rather than a fixture. It is what is worth seeing
 * from anywhere — a job runs for minutes while somebody is on the jog screen —
 * so a screen that takes the slot is saying its own business matters more
 * while you are standing on it.
 */
const StatusBar = ({ content, className = '', ...job }) => (
  <footer className={`flex h-[49px] shrink-0 items-center gap-gap border-t border-line bg-panel px-[14px] ${className}`}>
    {content ? content() : <JobStatusLine {...job} />}
  </footer>
);

export default StatusBar;
