import _ from 'lodash';

class TinyGLineParserResultOverrides {
    static parse(data) {
        const footer = _.get(data, 'f') || [];
        const statusCode = footer[1];
        const mfo = _.get(data, 'r.mfo');
        const mto = _.get(data, 'r.mto');
        const sso = _.get(data, 'r.sso');
        const payload = {};

        if ((typeof mfo === 'undefined') && (typeof mto === 'undefined') && (typeof sso === 'undefined')) {
            return null;
        }

        if (mfo && statusCode === 0) {
            payload.mfo = mfo;
        }
        if (mto && statusCode === 0) {
            payload.mto = mto;
        }
        if (sso && statusCode === 0) {
            payload.sso = sso;
        }

        return {
            type: TinyGLineParserResultOverrides,
            payload: payload
        };
    }
}

export default TinyGLineParserResultOverrides;
