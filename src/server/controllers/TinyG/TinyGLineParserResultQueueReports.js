import _ from 'lodash';
import { ensureFiniteNumber } from '../../lib/ensure-type';

class TinyGLineParserResultQueueReports {
    static parse(data) {
        const qr = _.get(data, 'r.qr') || _.get(data, 'qr');
        const qi = _.get(data, 'r.qi') || _.get(data, 'qi');
        const qo = _.get(data, 'r.qo') || _.get(data, 'qo');

        if (!qr) {
            return null;
        }

        const payload = {
            qr: ensureFiniteNumber(qr),
            qi: ensureFiniteNumber(qi),
            qo: ensureFiniteNumber(qo),
        };

        return {
            type: TinyGLineParserResultQueueReports,
            payload: payload,
        };
    }
}

export default TinyGLineParserResultQueueReports;
