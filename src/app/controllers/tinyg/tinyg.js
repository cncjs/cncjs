import _ from 'lodash';
import events from 'events';

class TinyGParser {
    parse(data) {
        const parsers = [
            TinyGParserResultStatusReports
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

class TinyGParserResultStatusReports {
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
            type: TinyGParserResultStatusReports,
            payload: payload
        };
    }
}

class TinyG extends events.EventEmitter {
    state = {
        sr: {}
    };
    parser = new TinyGParser();

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

            if (type === TinyGParserResultStatusReports) {
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
    TinyGParser
};
export default TinyG;
