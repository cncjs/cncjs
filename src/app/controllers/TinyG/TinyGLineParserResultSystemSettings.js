import _ from 'lodash';

// https://github.com/synthetos/g2/wiki/Text-Mode#displaying-settings-and-groups
class TinyGLineParserResultSystemSettings {
    static parse(data) {
        const sys = _.get(data, 'r.sys') || _.get(data, 'sys');
        if (!sys) {
            return null;
        }

        const payload = {
            sys: sys
        };

        return {
            type: TinyGLineParserResultSystemSettings,
            payload: payload
        };
    }
}

export default TinyGLineParserResultSystemSettings;
