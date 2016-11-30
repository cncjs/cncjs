import CNCEngine from './CNCEngine';

const cncengine = new CNCEngine();

const start = ({ server }) => {
    cncengine.start(server);
};

const stop = () => {
    cncengine.stop();
};

export default {
    start,
    stop
};
