import _ from 'lodash';

class TinyGLineParserResultReceiveReports {
  static parse(data) {
    let r = _.get(data, 'r.r') || _.get(data, 'r');
    if (!r && _.get(data, 'prb')) {
      // g2core automatic probe report ({prbr:1}): a bare line with no "r" wrapper. It is not a reply to a line.
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
