import CNCEngine from './CNCEngine';

const cncengine = new CNCEngine();

const start = (server, controller) => {
    cncengine.start(server, controller);
};

const stop = () => {
    cncengine.stop();
};

export default {
    start,
    stop
};
