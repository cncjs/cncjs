import _ from 'lodash';

class TinyGLineParserResultReceiveReports {
  static parse(data) {
    let r = _.get(data, 'r.r') || _.get(data, 'r');
    if (!r && _.get(data, 'prb')) {
      // With automatic probe reporting enabled ({"prbr": 1}), g2core sends
      // a top-level "prb" object without the "r" reply wrapper. Mark it as
      // unsolicited so the controller does not count it as a command reply.
      r = { prb: data.prb, unsolicited: true };
    }
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
