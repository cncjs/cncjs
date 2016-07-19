import _ from 'lodash';
import events from 'events';

class TinyG2Parser {
    parse(data) {
        const parsers = [
            TinyG2ParserResultStatusReports
        ];

        for (let parser of parsers) {
            const result = parser.parse(data);
            if (result) {
                _.set(result, 'payload.raw', data);
                return result;
            }
        }

        return {
            type: null,
            payload: {
                raw: data
            }
        };
    }
}

class TinyG2ParserResultStatusReports {
    static parse(data) {
        const sr = _.get(data, 'r.sr') || _.get(data, 'sr');
        if (!sr) {
            return null;
        }

        const payload = {
            workPosition: {
                x: _.get(sr, 'posx', null),
                y: _.get(sr, 'posy', null),
                z: _.get(sr, 'posz', null),
                a: _.get(sr, 'posa', null)
            },
            machinePosition: {
                x: _.get(sr, 'mpox', null),
                y: _.get(sr, 'mpoy', null),
                z: _.get(sr, 'mpoz', null),
                a: _.get(sr, 'mpoa', null)
            }
        };

        return {
            type: TinyG2ParserResultStatusReports,
            payload: payload
        };
    }
}

class TinyG2 extends events.EventEmitter {
    state = {
        sr: {}
    };
    parser = new TinyG2Parser();

    parse(data) {
        data = ('' + data).replace(/\s+$/, '');
        if (!data) {
            return;
        }

        this.emit('raw', { raw: data });

        if (data.match(/^{/)) {
            try {
                data = JSON.parse(data);
            } catch (err) {
                data = {};
            }

            const result = this.parser.parse(data) || {};
            const { type, payload } = result;

            if (type === TinyG2ParserResultStatusReports) {
                if (!_.isEqual(this.state.sr, payload)) {
                    this.emit('srchange', payload);
                    this.state = {
                        ...this.state,
                        sr: payload
                    };
                }
                this.emit('sr', payload);
                return;
            }
        }
    }
}

export {
    TinyG2Parser
};
export default TinyG2;
