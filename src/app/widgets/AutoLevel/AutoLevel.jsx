import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
// import numeral from 'numeral';
import ReactTable from 'react-table';
import './react-table.css';
import log from '../../lib/log';

import {
  MODAL_PREVIEW,
  MODAL_PREVIEW2
} from './constants';

class AutoLevel extends PureComponent {
  static propTypes = {
    state: PropTypes.object,
    actions: PropTypes.object
  };

  referenceZ = 0.0;

  render() {
    const { state, actions } = this.props;
    // log.info('AutoLevel.jsx state' + JSON.stringify(state));

    const colWidth = 60;
    const probingColumns = [{
      Header: 'x',
      accessor: 'x',
      width: colWidth
    }, {
      Header: 'y',
      accessor: 'y',
      width: colWidth
    }, {
      Header: 'z',
      accessor: 'z',
      width: colWidth
    }, {
      Header: 'pz',
      accessor: 'pz',
      width: colWidth
    }];

    if (Object.prototype.hasOwnProperty.call(state, 'probingData')) {
      //log.info('AutoLevel :' + JSON.stringify(state));
      //log.error('AutoLevel :' + JSON.stringify(state.probingData));
      //log.error('AutoLevel :' + JSON.stringify(state.probingData.result));
      // log.info('AutoLevel.jsx state.controller.state.status' + JSON.stringify(state.controller.state.status));
      // log.info('AutoLevel.jsx state.controller.state.status.wpos' + JSON.stringify(state.controller.state.status.wpos));

      if (state.probingData.printed === false) {
        state.probingData.printed = true;
        //log.error('AutoLevel.jsx result :' + JSON.stringify(state.probingData.result));
        log.info('AutoLevel.jsx result :' + JSON.stringify(state.probingData.result));

        let sx = state.controller.state.status.wpos.x;
        let sy = state.controller.state.status.wpos.y;
        let sz = state.probingData.result.z;
        // let sy = state.probingData.result.y;
        // let sz = state.probingData.result.z;

        // first data point becomes z reference
        if (state.probingObj.length === 0) {
          this.referenceZ = Number(sz);
        }

        // correct new z entry for autolevel plane
        // log.info('AutoLevel.jsx new reference: ' + this.referenceZ);
        let PRBz = Number(sz);
        let corz = PRBz - this.referenceZ; // corrected z
        // let cz = numeral(corz).format('0.000');

        state.probingObj.push({
          x: sx,
          y: sy,
          // z: cz,
          z: corz,
          pz: sz
        });
        log.info('AutoLevel.jsx probingObj : ' + JSON.stringify(state.probingObj));
      }
    }
    //log.info( 'AutoLevel render before return');

    return (
      <div>
        <div className="row no-gutters">
          <div>
            <ReactTable
              data={state.probingObj}
              columns={probingColumns}
              defaultPageSize={10}
            />
          </div>
        </div>
        <div className="row no-gutters">
          <div className="col-sm-3">
            <button
              type="button"
              className="btn btn-sm btn-default"
              onClick={() => {
                actions.openModalProbingSetup(MODAL_PREVIEW);
              }}
              disabled={false}
            >
              Setup
            </button>
          </div>
          <div className="col-sm-3">
            <button
              type="button"
              className="btn btn-sm btn-default"
              onClick={actions.clearGrid}
              disabled={false}
            >
              Clear
            </button>
          </div>
          <div className="col-sm-3">
            <button
              type="button"
              className="btn btn-sm btn-default"
              onClick={actions.handleClickSave}
              disabled={false}
            >
              Save
            </button>
          </div>
          <div className="col-sm-3">
            <button
              type="button"
              className="btn btn-sm btn-default"
              onClick={() => {
                actions.openModalApplyAutoLevel(MODAL_PREVIEW2);
              }}
              disabled={false}
            >
              Apply
            </button>
          </div>
        </div>
      </div >
    );
  }
}

export default AutoLevel;
