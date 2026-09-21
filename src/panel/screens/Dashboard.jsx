import DashboardPhone from './DashboardPhone';
import DashboardWide from './DashboardWide';
import { useIsPhone } from '../ui/shell';

/**
 * The screen an operator leaves up while a job runs.
 *
 * Two layouts, one chosen — not one layout with the differences written as
 * conditional classes through it. They differ in which widgets appear at all,
 * not only in how they are arranged, and a change made for one was quietly a
 * change to the other.
 */
const Dashboard = ({ machine, onGo }) => (
  useIsPhone()
    ? <DashboardPhone machine={machine} />
    : <DashboardWide machine={machine} onGo={onGo} />
);

export default Dashboard;
