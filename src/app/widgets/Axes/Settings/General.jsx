import includes from 'lodash/includes';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Space from '../../../components/Space';
import i18n from '../../../lib/i18n';

class General extends PureComponent {
    static propTypes = {
        axes: PropTypes.array.isRequired
    };

    fields = {
        axisX: null,
        axisY: null,
        axisZ: null,
        axisA: null,
        axisB: null,
        axisC: null
    };

    get value() {
        const axes = [];
        axes.push('x');
        this.fields.axisY.checked && axes.push('y');
        this.fields.axisZ.checked && axes.push('z');
        this.fields.axisA.checked && axes.push('a');
        this.fields.axisB.checked && axes.push('b');
        this.fields.axisC.checked && axes.push('c');

        return {
            axes: axes
        };
    }
    render() {
        const { axes } = this.props;

        return (
            <div>
                <div className="form-group">
                    <label><strong>{i18n._('Axes')}</strong></label>
                    <div className="row no-gutters">
                        <div className="col-xs-4">
                            <label>
                                <input
                                    ref={node => {
                                        this.fields.axisX = node;
                                    }}
                                    type="checkbox"
                                    checked
                                    disabled
                                />
                                <Space width="8" />
                                {i18n._('X-axis')}
                            </label>
                        </div>
                        <div className="col-xs-4">
                            <label>
                                <input
                                    ref={node => {
                                        this.fields.axisY = node;
                                    }}
                                    type="checkbox"
                                    defaultChecked={includes(axes, 'y')}
                                />
                                <Space width="8" />
                                {i18n._('Y-axis')}
                            </label>
                        </div>
                        <div className="col-xs-4">
                            <label>
                                <input
                                    ref={node => {
                                        this.fields.axisZ = node;
                                    }}
                                    type="checkbox"
                                    defaultChecked={includes(axes, 'z')}
                                />
                                <Space width="8" />
                                {i18n._('Z-axis')}
                            </label>
                        </div>
                        <div className="col-xs-4">
                            <label>
                                <input
                                    ref={node => {
                                        this.fields.axisA = node;
                                    }}
                                    type="checkbox"
                                    defaultChecked={includes(axes, 'a')}
                                />
                                <Space width="8" />
                                {i18n._('A-axis')}
                            </label>
                        </div>
                        <div className="col-xs-4">
                            <label>
                                <input
                                    ref={node => {
                                        this.fields.axisB = node;
                                    }}
                                    type="checkbox"
                                    defaultChecked={includes(axes, 'b')}
                                />
                                <Space width="8" />
                                {i18n._('B-axis')}
                            </label>
                        </div>
                        <div className="col-xs-4">
                            <label>
                                <input
                                    ref={node => {
                                        this.fields.axisC = node;
                                    }}
                                    type="checkbox"
                                    defaultChecked={includes(axes, 'c')}
                                />
                                <Space width="8" />
                                {i18n._('C-axis')}
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default General;
