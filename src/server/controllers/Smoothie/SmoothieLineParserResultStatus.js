/* eslint no-bitwise: ["error", { "allow": ["&", "<<"] }] */
import { ensureArray, ensureNumber } from 'ensure-type';
import _ from 'lodash';

const floatPointNumber = '[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)';
const pattern = new RegExp(`[a-zA-Z]+(:${floatPointNumber}(,${floatPointNumber}){0,5})?`, 'g');

class SmoothieLineParserResultStatus {
  // Old status format
  //   <Idle,MPos:5.5290,0.5600,7.0000,0.0000,0.0000,0.0000,WPos:1.5290,-5.4400,0.0000>
  //
  // New status format
  //   <Home|MPos:x,y,z,a,b,c|WPos:x,y,z|F:current_feedrate,requested_feedrate,override|L:lp|S:sr|T:current_temperature,target_temperature>
  //   <Run|MPos:x,y,z,a,b,c|WPos:x,y,z|F:current_feedrate,requested_feedrate,override|L:lp|S:sr|T:current_temperature,target_temperature>
  //   <Alarm|MPos:x,y,z,a,b,c|WPos:x,y,z|F:requested_feedrate,override|T:current_temperature,target_temperature>
  //   <Hold|MPos:x,y,z,a,b,c|WPos:x,y,z|F:requested_feedrate,override|T:current_temperature,target_temperature>
  //   <Idle|MPos:x,y,z,a,b,c|WPos:x,y,z|F:requested_feedrate,override|T:current_temperature,target_temperature>
  static parse(line) {
    const r = line.match(/^<(.+)>$/);
    if (!r) {
      return null;
    }

    const payload = {};
    const params = r[1].match(pattern);
    const result = {};

    { // Supported states: Alarm, Home, Hold, Idle, Run
      const states = (params.shift() || '').split(':');
      payload.activeState = states[0] || '';
    }

    for (let param of params) {
      const nv = param.match(/^(.+):(.+)/);
      if (nv) {
        let type = nv[1];
        let value = nv[2].split(',');
        result[type] = value;
      }
    }

    // machine position - reported in current units
    if (_.has(result, 'MPos')) {
      const axes = ['x', 'y', 'z', 'a', 'b', 'c'];
      const mPos = _.get(result, 'MPos', ['0.000', '0.000', '0.000']); // Defaults to [x, y, z]
      payload.mpos = {};
      for (let i = 0; i < mPos.length; ++i) {
        payload.mpos[axes[i]] = mPos[i];
      }
    }

    // work position - reported in current units
    if (_.has(result, 'WPos')) {
      const axes = ['x', 'y', 'z', 'a', 'b', 'c'];
      const wPos = _.get(result, 'WPos', ['0.000', '0.000', '0.000']); // Defaults to [x, y, z]
      payload.wpos = {};
      for (let i = 0; i < wPos.length; ++i) {
        payload.wpos[axes[i]] = wPos[i];
      }
    }

    // feedrate
    if (_.has(result, 'F')) {
      if (_.includes(['Home', 'Run'], payload.activeState)) {
        // F:current_feedrate,requested_feedrate,override
        const [currentFeedrate, feedrate, feedrateOverride] = ensureArray(result.F);
        payload.currentFeedrate = ensureNumber(currentFeedrate) || 0;
        payload.feedrate = ensureNumber(feedrate) || 0;
        payload.feedrateOverride = ensureNumber(feedrateOverride) || 0;
      } else {
        // F:requested_feedrate,override
        const [feedrate, feedrateOverride] = ensureArray(result.F);
        payload.feedrate = ensureNumber(feedrate) || 0;
        payload.feedrateOverride = ensureNumber(feedrateOverride) || 0;
      }
    }

    // laser power
    if (_.has(result, 'L')) {
      const [laserPower] = ensureArray(result.L);
      payload.laserPower = ensureNumber(laserPower) || 0;
    }

    // laser intensity
    if (_.has(result, 'S')) {
      const [laserIntensity] = ensureArray(result.S);
      payload.laserIntensity = ensureNumber(laserIntensity) || 0;
    }

    // temperature
    if (_.has(result, 'T')) {
      const [currentTemperature, targetTemperature] = ensureArray(result.T);
      payload.currentTemperature = ensureNumber(currentTemperature) || 0;
      payload.targetTemperature = ensureNumber(targetTemperature) || 0;
    }

    return {
      type: SmoothieLineParserResultStatus,
      payload: payload
    };
  }
}

export default SmoothieLineParserResultStatus;
