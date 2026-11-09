import controller from '@app/lib/controller';
import createConnectionRuntime from './connectionRuntime';

const connectionRuntime = createConnectionRuntime({ controller });

export default connectionRuntime;
