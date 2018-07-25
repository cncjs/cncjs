import _ from 'lodash';

class TinyGLineParserResultQueueReports {
    static parse(data) {
        const qr = _.get(data, 'r.qr') || _.get(data, 'qr');
        const qi = _.get(data, 'r.qi') || _.get(data, 'qi');
        const qo = _.get(data, 'r.qo') || _.get(data, 'qo');

        if (!qr) {
            return null;
        }

        const payload = {
            qr: Number(qr) || 0,
            qi: Number(qi) || 0,
            qo: Number(qo) || 0
        };

        return {
            type: TinyGLineParserResultQueueReports,
            payload: payload
        };
    }
}

export default TinyGLineParserResultQueueReports;
