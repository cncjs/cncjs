import Grbl from './grbl';

class CNCServer {
    grbl = null;

    constructor() {
        this.grbl = new Grbl();
    }
    open(options) {
        this.grbl.open(options);
    }
    close() {
        this.grbl.close();
    }
}

let cncServer = new CNCServer();

cncServer.open({
    port: '/dev/cu.wchusbserialfa130',
    baudrate: 115200
});
