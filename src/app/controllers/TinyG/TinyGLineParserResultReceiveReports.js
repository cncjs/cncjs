import _ from 'lodash';

class TinyGLineParserResultReceiveReports {
    static parse(data) {
        const r = _.get(data, 'r.r') || _.get(data, 'r');
        if (!r) {
            return null;
        }

        const payload = {
            r: r
        };

        return {
            type: TinyGLineParserResultReceiveReports,
            payload: payload
        };
    }
}

export default TinyGLineParserResultReceiveReports;
