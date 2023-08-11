// import _max from 'lodash/max';
import PropTypes from 'prop-types';
import pick from 'lodash/pick';
import React, { PureComponent } from 'react';
import Modal from 'app/components/Modal';
import i18n from 'app/lib/i18n';
import log from '../../lib/log';
import styles from './index.styl';

class ApplyAutoLevel extends PureComponent {
  static propTypes = {
    state: PropTypes.object,
    actions: PropTypes.object
  };

  state = {
    probingFileName: '',
    step: 0,
    gcodeFileName: '',
    probingDataSource: 1,
    hideFile: false,
    probingBbox: {
      min: {
        x: 0,
        y: 0,
      },
      max: {
        x: 0,
        y: 0,
      },
      delta: {
        x: 0,
        y: 0,
      }
    },
    origBbox: {
      min: {
        x: 0,
        y: 0,
      },
      max: {
        x: 0,
        y: 0,
      },
      delta: {
        x: 0,
        y: 0,
      }
    },
    canClickSave: false,
    canClickUpload: false
  }

  alFileNamePrefix = '#AL:'

  probedPoints = [];

  gcode = '';

  result = [];

  choice = null;

  fileInputEl = null;

  delta = 10;

  componentDidMount() {
    // const { state, actions } = this.props;
    const { state } = this.props;

    //log.info('ApplyAutoLevel componentDidMount');
    this.probedPoints = state.probingObj;
    //log.info('ApplyAutoLevel componentDidMount probedPoints \n' + JSON.stringify(this.probedPoints));
    this.updateBbox();
  }

  canClick() {
    // const { state, actions } = this.props;
    const { state } = this.props;

    if (this.probedPoints.length > 0 && this.gcode.length > 0) {
      this.setState({ canClickSave: true });
      if (state.canClick) {
        this.setState({ canClickUpload: true });
      }
    }
    // const canClickSave = (this.probedPoints.length > 0 && this.gcode.length > 0);
    // const canClickUpload = canClick && (this.probedPoints.length > 0 && this.gcode.length > 0);
    // log.info('ApplyAutoLevel canClick this.probedPoints.length:' + this.probedPoints.length);
    // log.info('ApplyAutoLevel canClick this.gcode  \n' + this.gcode);
    // log.info('ApplyAutoLevel canClick this.gcode.length:' + this.gcode.length);
    // log.info('ApplyAutoLevel canClick canClickupload:' + this.state.canClickUpload);
  }

  updateBbox() {
    let xArray = this.probedPoints.map((o) => {
      return o.x;
    });
    let yArray = this.probedPoints.map((o) => {
      return o.y;
    });
    let xmin = Math.min.apply(null, xArray);
    let xmax = Math.max.apply(null, xArray);
    let ymin = Math.min.apply(null, yArray);
    let ymax = Math.max.apply(null, yArray);
    xmin = xmin === Infinity ? 0 : xmin;
    xmax = xmax === -Infinity ? 0 : xmax;
    ymin = ymin === Infinity ? 0 : ymin;
    ymax = ymax === -Infinity ? 0 : ymax;
    let dX = Math.abs(xmax - xmin);
    let dY = Math.abs(ymax - ymin);
    this.setState({
      probingBbox: {
        min: {
          x: xmin,
          y: ymin,
        },
        max: {
          x: xmax,
          y: ymax,
        },
        delta: {
          x: dX,
          y: dY,
        }
      }
    });
  }

  handleClickUpload = (param) => {
    this.choice = param;
    //log.info( 'ApplyAutoLevel handleClickUpload choice=' + this.choice);
    this.fileInputEl.value = null;
    this.fileInputEl.click();
  };

  handleLoadFile = (event) => {
    //log.info( 'ApplyAutoLevel handleLoadFile choice=' + this.choice);
    // const { actions } = this.props;
    const files = event.target.files;
    const file = files[0];
    const reader = new FileReader();
    reader.onloadend = (event) => {
      // const { result, error } = event.target;
      const { error } = event.target;

      if (error) {
        log.error(error);
        return;
      }

      log.debug('FileReader:', pick(file, [
        'lastModified',
        'lastModifiedDate',
        'meta',
        'name',
        'size',
        'type'
      ]));

      let contents = event.target.result;
      if (this.choice === 1) {
        this.setState({ probingFileName: file.name });
        this.readProbingFile(contents);
      }
      if (this.choice === 2) {
        this.setState({ gcodeFileName: file.name });
        this.readGcodeFile(contents);
      }
    };

    try {
      reader.readAsText(file);
    } catch (err) {
      log.error('ApplyAutoLevel handleLoadFile error reading file');
    }
  };

  readProbingFile = (contents) => {
    //log.info( 'ApplyAutoLevel readProbingFile result \n' + contents);
    this.probedPoints = JSON.parse(contents);
    this.delta = this.probedPoints[1].x - this.probedPoints[0].x;
    log.info('ApplyAutoLevel step=' + this.delta);
    this.setState({ step: this.delta });

    //log.info('ApplyAutoLevel readProbingFile probedPoints \n' + JSON.stringify(this.probedPoints));
    //log.info( 'ApplyAutoLevel readProbingFile probedPoints length \n' + this.probedPoints.length);
    //log.info( 'ApplyAutoLevel readProbingFile probedPoints[3].z \n' + this.probedPoints[3].z);
    this.updateBbox();
    this.canClick();
  }

  readGcodeFile = (contents) => {
    //log.info('ApplyAutoLevel gcodeFile  \n' + contents);
    this.gcode = contents;
    // log.info('ApplyAutoLevel readGcodeFile this.gcode  \n' + this.gcode);
    this.findMinMax();
    this.canClick();
  }

  findMinMax = () => {
    let lines = this.gcode.split('\n');
    let xmin = Infinity;
    let xmax = -Infinity;
    let ymin = Infinity;
    let ymax = -Infinity;
    let pt = {
      x: 0,
      y: 0,
      z: 0
    };
    lines.forEach((line, index) => {
      let lineStripped = this.stripComments(line);
      let xMatch = /X([\.\+\-\d]+)/gi.exec(lineStripped);
      if (xMatch) {
        pt.x = parseFloat(xMatch[1]);
      }
      let yMatch = /Y([\.\+\-\d]+)/gi.exec(lineStripped);
      if (yMatch) {
        pt.y = parseFloat(yMatch[1]);
      }
      let zMatch = /Z([\.\+\-\d]+)/gi.exec(lineStripped);
      if (zMatch) {
        pt.z = parseFloat(zMatch[1]);
      }
      // log.info('ApplyAutoLevel findMinMax pt ' + JSON.stringify(pt));
      xmin = (pt.x < xmin ? pt.x : xmin);
      xmax = (pt.x > xmax ? pt.x : xmax);
      ymin = (pt.y < ymin ? pt.y : ymin);
      ymax = (pt.y > ymax ? pt.y : ymax);
    });
    // log.info('ApplyAutoLevel findMinMax origBbox.min.x ' + this.state.origBbox.min.x);
    let dX = Math.abs(xmax - xmin);
    let dY = Math.abs(ymax - ymin);
    this.setState({
      origBbox: {
        min: {
          x: xmin,
          y: ymin,
        },
        max: {
          x: xmax,
          y: ymax,
        },
        delta: {
          x: dX,
          y: dY,
        }
      }
    });
  }

  autolevelSave = (contents) => {
    log.info('ApplyAutoLevel autolevelSave \n');
    this.applyCompensation();
    //log.info('ApplyAutoLevel autolevelSave this.result \n' + this.result);
    const newgcodeFileName = this.alFileNamePrefix + this.state.gcodeFileName;
    //log.info( 'ApplyAutoLevel autolevelSave AL: loading new gcode' + newgcodeFileName);
    //log.info('ApplyAutoLevel autolevelSave AL: new gcode' + result.join('\n'));
    let fileName = newgcodeFileName;
    let fileContent = this.result.join('\n');
    this.download(fileContent, fileName, 'text/plain');
  }

  autolevelUpload = (contents) => {
    // const { state, actions } = this.props;
    const { actions } = this.props;
    this.applyCompensation();
    actions.loadAutoLevelledGcode(this.result);
  }

  applyCompensation() {
    log.info('ApplyAutoLevel applyCompensation AL: applying compensation ...\n');
    // log.info('ApplyAutoLevel applyCompensation state:' + JSON.stringify(state));

    try {
      let lines = this.gcode.split('\n');
      let p0 = {
        x: 0,
        y: 0,
        z: 0
      };
      let pt = {
        x: 0,
        y: 0,
        z: 0
      };

      let abs = true;
      lines.forEach((line, index) => {
        //log.info('ApplyAutoLevel applyCompensation line ' + index + '\n' + line);
        let lineStripped = this.stripComments(line);
        if (!/(X|Y|Z)/gi.test(lineStripped)) {
          this.result.push(lineStripped); // no coordinate change --> copy to output
        } else {
          log.info('else');
          // let f = 1;
          if (/(G38.+|G5.+|G10|G2.+|G4.+|G92|G92.1)/gi.test(lineStripped)) {
            this.result.push(lineStripped); // skip compensation for these G-Codes
          } else {
            if (/G91/i.test(lineStripped)) {
              abs = false;
            }
            if (/G90/i.test(lineStripped)) {
              abs = true;
            }
            let xMatch = /X([\.\+\-\d]+)/gi.exec(lineStripped);
            if (xMatch) {
              pt.x = parseFloat(xMatch[1]);
            }
            let yMatch = /Y([\.\+\-\d]+)/gi.exec(lineStripped);
            if (yMatch) {
              pt.y = parseFloat(yMatch[1]);
            }
            let zMatch = /Z([\.\+\-\d]+)/gi.exec(lineStripped);
            if (zMatch) {
              pt.z = parseFloat(zMatch[1]);
            }

            if (abs) {
              // strip coordinates
              lineStripped = lineStripped.replace(/([XYZ])([\.\+\-\d]+)/gi, '');
              let segs = this.splitToSegments(p0, pt);
              for (let seg of segs) {
                let cpt = this.compensateZCoord(seg);
                let newLine = lineStripped + ` X${cpt.x.toFixed(3)} Y${cpt.y.toFixed(3)} Z${cpt.z.toFixed(3)} ; Z${seg.z.toFixed(3)}`;
                this.result.push(newLine.trim());
              }
            } else {
              this.result.push(lineStripped);
              log.info('WARNING: using relative mode may not produce correct results');
            }
            p0 = {
              x: pt.x,
              y: pt.y,
              z: pt.z
            }; // clone
          }
        }
      });
      log.info('ApplyAutoLevel applyCompensation AL: finished');
      //log.info('ApplyAutoLevel applyCompensation result:' + this.result);
    } catch (x) {
      log.info('ApplyAutoLevel applyCompensation AL: error occurred' + x);
    }
    log.info('ApplyAutoLevel applyCompensation Leveling applied\n');
  }

  download = (content, fileName, contentType) => {
    let a = document.createElement('a');
    let file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
  }

  stripComments(line) {
    const re1 = new RegExp(/\s*\([^\)]*\)/g); // Remove anything inside the parentheses
    const re2 = new RegExp(/\s*;.*/g); // Remove anything after a semi-colon to the end of the line, including preceding spaces
    const re3 = new RegExp(/\s+/g);
    return (line.replace(re1, '').replace(re2, '').replace(re3, ''));
  }

  distanceSquared3(p1, p2) {
    return (p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y) + (p2.z - p1.z) * (p2.z - p1.z);
  }

  distanceSquared2(p1, p2) {
    return (p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y);
  }

  crossProduct3(u, v) {
    return {
      x: (u.y * v.z - u.z * v.y),
      y: -(u.x * v.z - u.z * v.x),
      z: (u.x * v.y - u.y * v.x)
    };
  }

  isColinear(u, v) {
    return Math.abs(u.x * v.y - u.y * v.x) < 0.00001;
  }

  sub3(p1, p2) {
    return {
      x: p1.x - p2.x,
      y: p1.y - p2.y,
      z: p1.z - p2.z
    };
  }

  formatPt(pt) {
    return `(x:${pt.x.toFixed(3)} y:${pt.y.toFixed(3)} z:${pt.z.toFixed(3)})`;
  }

  splitToSegments(p1, p2) {
    //log.info('ApplyAutoLevel delta=' + this.delta);
    let res = [];
    let v = this.sub3(p2, p1); // delta
    let dist = Math.sqrt(this.distanceSquared3(p1, p2)); // distance
    let dir = {
      x: v.x / dist,
      y: v.y / dist,
      z: v.z / dist
    }; // direction vector
    let maxSegLength = this.delta / 2;
    //log.info('ApplyAutoLevel maxSegLength=' + maxSegLength);
    res.push({
      x: p1.x,
      y: p1.y,
      z: p1.z
    });// first point
    for (let d = maxSegLength; d < dist; d += maxSegLength) {
      res.push({
        x: p1.x + dir.x * d,
        y: p1.y + dir.y * d,
        z: p1.z + dir.z * d
      });// split points
    }
    res.push({
      x: p2.x,
      y: p2.y,
      z: p2.z
    }); // last point
    //log.info('ApplyAutoLevel res:' + JSON.stringify(res));
    return res;
  }

  getThreeClosestPoints(pt) {
    let res = [];
    if (this.probedPoints.length < 3) {
      return res;
    }
    this.probedPoints.sort((a, b) => {
      return this.distanceSquared2(a, pt) < this.distanceSquared2(b, pt) ? -1 : 1;
    });
    let i = 0;
    while (res.length < 3 && i < this.probedPoints.length) {
      if (res.length === 2) {
        // make sure points are not colinear
        if (!this.isColinear(this.sub3(res[1], res[0]), this.sub3(this.probedPoints[i], res[0]))) {
          res.push(this.probedPoints[i]);
        }
      } else {
        res.push(this.probedPoints[i]);
      }
      i++;
    }
    return res;
  }

  compensateZCoord(pt) {
    let points = this.getThreeClosestPoints(pt);
    if (points.length < 3) {
      log.error('Cant find 3 closest points');
      return pt;
    }
    let normal = this.crossProduct3(this.sub3(points[1], points[0]), this.sub3(points[2], points[0]));
    let pp = points[0];// point on plane
    let dz = 0; // compensation delta
    if (normal.z !== 0) {
      // find z at the point seg, on the plane defined by three points
      dz = pp.z - (normal.x * (pt.x - pp.x) + normal.y * (pt.y - pp.y)) / normal.z;
    } else {
      log.error(this.formatPt(pt), 'normal.z is zero', this.formatPt(points[0]), this.formatPt(points[1]), this.formatPt(points[2]));
    }
    return {
      x: pt.x,
      y: pt.y,
      z: pt.z + dz
    };
  }

  handleUseCurrent() {
    // const { state, actions } = this.props;
    const { state } = this.props;

    this.probedPoints = state.probingObj;
    log.info('ApplyAutoLevel handleUseCurrent probedPoints \n' + JSON.stringify(this.probedPoints));
    this.setState({ hideFile: false });
    this.updateBbox();
    this.canClick();
  }

  handleUseFile() {
    this.setState({ hideFile: true });
    this.setState({ probingFileName: '' });
    this.canClick();
  }

  render() {
    // const { state, actions } = this.props;
    const { actions } = this.props;
    const {
      probingDataSource, probingBbox, origBbox
    } = this.state;
    const displayUnits = i18n._('mm');
    const mystyle = this.state.hideFile ? {} : { display: 'none' };
    const none = '–';
    //log.info('ApplyAutoLevel render:' + JSON.stringify(state));
    //log.info('ApplyAutoLevel render:' + JSON.stringify(state.probingObj));
    //log.info('ApplyAutoLevel render this.gcode  \n' + this.gcode);
    // log.info('ApplyAutoLevel render styles.well  \n' + styles.well);

    return (
      <Modal disableOverlay size="sm" onClose={actions.closeModal}>
        <Modal.Header>
          <Modal.Title>{i18n._('Apply Autolevel')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <input
            // The ref attribute adds a reference to the component to
            // this.refs when the component is mounted.
            ref={(node) => {
              this.fileInputEl = node;
            }}
            type="file"
            style={{ display: 'none' }}
            multiple={false}
            onChange={this.handleLoadFile}
          />
          <div className="form-group">
            <label><strong>{i18n._('Probing Data:')}</strong></label>
            <div className="radio" style={{ marginTop: 0 }}>
              <label>
                <input
                  type="radio"
                  name="probingDataSource"
                  value={3}
                  checked={probingDataSource === 1}
                  onChange={() => {
                    this.setState({ probingDataSource: 1 });
                    this.handleUseCurrent();
                  }}
                />
                {i18n._('Use current probing data')}
              </label>
              <label>
                <input
                  type="radio"
                  name="probingDataSource"
                  value={1}
                  checked={probingDataSource === 2}
                  onChange={() => {
                    this.setState({ probingDataSource: 2 });
                    this.handleUseFile();
                  }}
                />
                {i18n._('Use a file')}
              </label>
            </div>
            <div
              className="row row-no-gutters"
              style={mystyle}
            >
              <div style={{ marginLeft: 20 }}>
                <div className="col-sm-10">
                  <div
                    className={styles.well}
                    title={this.state.probingFileName}
                    disabled={true}
                  >
                    {this.state.probingFileName || none}
                  </div>

                </div>
                <div className="col-sm-2">
                  <button
                    type="button"
                    className="btn btn-default"
                    title={i18n._('Upload Probing Data')}
                    onClick={() => this.handleClickUpload(1)}
                  >
                    {i18n._('Select')}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="row no-gutters">
            <div className={styles['gcode-stats']}>
              <table className="table-bordered" data-table="dimension">
                <thead>
                  <tr>
                    <th className={styles.axis}>{i18n._('Axis')}</th>
                    <th>{i18n._('Min')}</th>
                    <th>{i18n._('Max')}</th>
                    <th>{i18n._('Dimension')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={styles.axis}>X</td>
                    <td>{probingBbox.min.x} {displayUnits}</td>
                    <td>{probingBbox.max.x} {displayUnits}</td>
                    <td>{probingBbox.delta.x} {displayUnits}</td>
                  </tr>
                  <tr>
                    <td className={styles.axis}>Y</td>
                    <td>{probingBbox.min.y} {displayUnits}</td>
                    <td>{probingBbox.max.y} {displayUnits}</td>
                    <td>{probingBbox.delta.y} {displayUnits}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <label><strong>{i18n._('Original G-Code:')}</strong></label>
          <div className="row row-no-gutters">
            <div style={{ marginLeft: 20 }}>
              <div className="col-sm-10">
                <div className={styles.well} title={this.state.gcodeFileName}>
                  {this.state.gcodeFileName || none}
                </div>
              </div>
              <div className="col-sm-2">
                <button
                  type="button"
                  className="btn btn-default"
                  title={i18n._('Upload G-code')}
                  onClick={() => this.handleClickUpload(2)}
                >
                  {i18n._('Select')}
                </button>
              </div>
            </div>
          </div>
          <div className="row no-gutters">
            <div className={styles['gcode-stats']}>
              <table className="table-bordered" data-table="dimension">
                <thead>
                  <tr>
                    <th className={styles.axis}>{i18n._('Axis')}</th>
                    <th>{i18n._('Min')}</th>
                    <th>{i18n._('Max')}</th>
                    <th>{i18n._('Dimension')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className={styles.axis}>X</td>
                    <td>{origBbox.min.x} {displayUnits}</td>
                    <td>{origBbox.max.x} {displayUnits}</td>
                    <td>{origBbox.delta.x} {displayUnits}</td>
                  </tr>
                  <tr>
                    <td className={styles.axis}>Y</td>
                    <td>{origBbox.min.y} {displayUnits}</td>
                    <td>{origBbox.max.y} {displayUnits}</td>
                    <td>{origBbox.delta.y} {displayUnits}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button
            type="button"
            className="btn btn-default"
            onClick={actions.closeModal}
          >
            {i18n._('Cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              actions.closeModal();
              this.autolevelUpload('hello');
            }}
            disabled={!this.state.canClickUpload}
          >
            {i18n._('Upload G-Code')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              actions.closeModal();
              this.autolevelSave('hello');
            }}
            disabled={!this.state.canClickSave}
          >
            {i18n._('Make File')}
          </button>
        </Modal.Footer>
      </Modal >
    );
  }
}

export default ApplyAutoLevel;
