import { ensureArray } from 'ensure-type';
import _includes from 'lodash/includes';
import _set from 'lodash/set';
import PropTypes from 'prop-types';
import _uniqueId from 'lodash/uniqueId';
import React, { PureComponent } from 'react';
import ForEach from 'react-foreach';
import { Button } from 'app/components/Buttons';
import { Checkbox } from 'app/components/Checkbox';
import { Input } from 'app/components/Forms';
import FormGroup from 'app/components/FormGroup';
import { FlexContainer, Row, Col } from 'app/components/GridSystem';
import Margin from 'app/components/Margin';
import Space from 'app/components/Space';
import i18n from 'app/lib/i18n';

const IMPERIAL_JOG_DISTANCES_MAX = 5;
const METRIC_JOG_DISTANCES_MAX = 5;

class General extends PureComponent {
    static propTypes = {
      axes: PropTypes.array.isRequired,
      imperialJogDistances: PropTypes.array.isRequired,
      metricJogDistances: PropTypes.array.isRequired
    };

    field = {
      axisX: null,
      axisY: null,
      axisZ: null,
      axisA: null,
      axisB: null,
      axisC: null
    };

    state = {
      imperialJogDistances: ensureArray(this.props.imperialJogDistances),
      metricJogDistances: ensureArray(this.props.metricJogDistances)
    };

    get value() {
      // Axes
      const axes = [];
      axes.push('x');
      this.field.axisY.checked && axes.push('y');
      this.field.axisZ.checked && axes.push('z');
      this.field.axisA.checked && axes.push('a');
      this.field.axisB.checked && axes.push('b');
      this.field.axisC.checked && axes.push('c');

      // Imperial Jog Distance
      const imperialJogDistances = [];
      for (let i = 0; i < this.state.imperialJogDistances.length; ++i) {
        const value = Number(this.state.imperialJogDistances[i]);
        if (value > 0) {
          imperialJogDistances.push(value);
        }
      }

      // Metric Jog Distance
      const metricJogDistances = [];
      for (let i = 0; i < this.state.metricJogDistances.length; ++i) {
        const value = Number(this.state.metricJogDistances[i]);
        if (value > 0) {
          metricJogDistances.push(value);
        }
      }

      return {
        axes,
        imperialJogDistances,
        metricJogDistances
      };
    }

    withFieldRef = (key) => (node) => {
      _set(this.field, key, node);
    };

    addMetricJogDistance = () => (event) => {
      this.setState(state => ({
        metricJogDistances: state.metricJogDistances.concat('')
      }));
    };

    changeMetricJogDistance = (targetIndex) => (event) => {
      const targetValue = event.target.value;

      this.setState(state => ({
        metricJogDistances: state.metricJogDistances.map((value, index) => {
          if (index === targetIndex) {
            return targetValue;
          }
          return value;
        })
      }));
    };

    removeMetricJogDistance = (index) => (event) => {
      this.setState(state => {
        const metricJogDistances = [...state.metricJogDistances];
        // Remove the array element at the index
        metricJogDistances.splice(index, 1);

        return {
          metricJogDistances: metricJogDistances
        };
      });
    };

    addImperialJogDistance = () => (event) => {
      this.setState(state => ({
        imperialJogDistances: state.imperialJogDistances.concat('')
      }));
    };

    changeImperialJogDistance = (targetIndex) => (event) => {
      const targetValue = event.target.value;

      this.setState(state => ({
        imperialJogDistances: state.imperialJogDistances.map((value, index) => {
          if (index === targetIndex) {
            return targetValue;
          }
          return value;
        })
      }));
    };

    removeImperialJogDistance = (index) => (event) => {
      this.setState(state => {
        const imperialJogDistances = [...state.imperialJogDistances];
        // Remove the array element at the index
        imperialJogDistances.splice(index, 1);

        return {
          imperialJogDistances: imperialJogDistances
        };
      });
    };

    render() {
      const { axes } = this.props;
      const { imperialJogDistances, metricJogDistances } = this.state;

      return (
        <FlexContainer fluid gutterWidth={0}>
          <Margin bottom={15}>
            <label><strong>{i18n._('Axes')}</strong></label>
            <Row>
              <Col xs={4}>
                <FormGroup>
                  <Checkbox
                    ref={this.withFieldRef('axisX')}
                    checked
                    disabled
                  >
                    <Space width="8" />
                    {i18n._('X-axis')}
                  </Checkbox>
                </FormGroup>
              </Col>
              <Col xs={4}>
                <FormGroup>
                  <Checkbox
                    ref={this.withFieldRef('axisY')}
                    defaultChecked={_includes(axes, 'y')}
                  >
                    <Space width="8" />
                    {i18n._('Y-axis')}
                  </Checkbox>
                </FormGroup>
              </Col>
              <Col xs={4}>
                <FormGroup>
                  <Checkbox
                    ref={this.withFieldRef('axisZ')}
                    defaultChecked={_includes(axes, 'z')}
                  >
                    <Space width="8" />
                    {i18n._('Z-axis')}
                  </Checkbox>
                </FormGroup>
              </Col>
            </Row>
            <Row>
              <Col xs={4}>
                <FormGroup>
                  <Checkbox
                    ref={this.withFieldRef('axisA')}
                    defaultChecked={_includes(axes, 'a')}
                  >
                    <Space width="8" />
                    {i18n._('A-axis')}
                  </Checkbox>
                </FormGroup>
              </Col>
              <Col xs={4}>
                <FormGroup>
                  <Checkbox
                    ref={this.withFieldRef('axisB')}
                    defaultChecked={_includes(axes, 'b')}
                  >
                    <Space width="8" />
                    {i18n._('B-axis')}
                  </Checkbox>
                </FormGroup>
              </Col>
              <Col xs={4}>
                <FormGroup>
                  <Checkbox
                    ref={this.withFieldRef('axisC')}
                    defaultChecked={_includes(axes, 'c')}
                  >
                    <Space width="8" />
                    {i18n._('C-axis')}
                  </Checkbox>
                </FormGroup>
              </Col>
            </Row>
          </Margin>
          <Margin bottom={15}>
            <Row>
              <Col>
                <label><strong>{i18n._('Custom Jog Distance (mm)')}</strong></label>
                <ForEach items={metricJogDistances}>
                  {(value, index) => (
                    <FormGroup key={_uniqueId()}>
                      <Row>
                        <Col>
                          <Input
                            type="number"
                            onChange={this.changeMetricJogDistance(index)}
                            defaultValue={value}
                          />
                        </Col>
                        <Col>
                          <Space width="8" />
                          <Button
                            btnStyle="flat"
                            compact
                            onClick={this.removeMetricJogDistance(index)}
                          >
                            <i className="fa fa-close" />
                          </Button>
                        </Col>
                      </Row>
                    </FormGroup>
                  )}
                </ForEach>
                {metricJogDistances.length < METRIC_JOG_DISTANCES_MAX && (
                  <Button
                    btnStyle="flat"
                    onClick={this.addMetricJogDistance()}
                  >
                    <i className="fa fa-plus" />
                    <Space width="8" />
                    {i18n._('Add')}
                  </Button>
                )}
              </Col>
              <Col width="auto">
                <Space width="24" />
              </Col>
              <Col>
                <label><strong>{i18n._('Custom Jog Distance (inches)')}</strong></label>
                <ForEach items={imperialJogDistances}>
                  {(value, index) => (
                    <FormGroup key={_uniqueId()}>
                      <Row>
                        <Col>
                          <Input
                            type="number"
                            defaultValue={value}
                            onChange={this.changeImperialJogDistance(index)}
                          />
                        </Col>
                        <Col>
                          <Space width="8" />
                          <Button
                            btnStyle="flat"
                            compact
                            onClick={this.removeImperialJogDistance(index)}
                          >
                            <i className="fa fa-close" />
                          </Button>
                        </Col>
                      </Row>
                    </FormGroup>
                  )}
                </ForEach>
                {imperialJogDistances.length < IMPERIAL_JOG_DISTANCES_MAX && (
                  <Button
                    btnStyle="flat"
                    onClick={this.addImperialJogDistance()}
                  >
                    <i className="fa fa-plus" />
                    <Space width="8" />
                    {i18n._('Add')}
                  </Button>
                )}
              </Col>
            </Row>
          </Margin>
        </FlexContainer>
      );
    }
}

export default General;
