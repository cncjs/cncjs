import includes from 'lodash/includes';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Space from '../../../components/Space';
import { Form, Textarea } from '../../../components/Validation';
import i18n from '../../../lib/i18n';
import * as validations from '../../../lib/validations';

class General extends PureComponent {
    static propTypes = {
        show: PropTypes.bool,
        axes: PropTypes.array.isRequired,
        wzero: PropTypes.string.isRequired,
        mzero: PropTypes.string.isRequired
    };
    static defaultProps = {
        show: false
    };

    fields = {
        axisX: null,
        axisY: null,
        axisZ: null,
        axisA: null,
        wzero: null,
        mzero: null
    };

    get value() {
        const {
            wzero,
            mzero
        } = this.form.getValues();

        const axes = [];
        axes.push('x');
        axes.push('y');
        this.fields.axisZ.checked && axes.push('z');
        this.fields.axisA.checked && axes.push('a');

        return {
            axes: axes,
            wzero: wzero,
            mzero: mzero
        };
    }
    render() {
        const { show, axes, wzero, mzero } = this.props;

        return (
            <div style={{ display: show ? 'block' : 'none' }}>
                <div className="form-group">
                    <label><strong>{i18n._('Axes')}</strong></label>
                    <div className="row no-gutters">
                        <div className="col-xs-3">
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
                        <div className="col-xs-3">
                            <label>
                                <input
                                    ref={node => {
                                        this.fields.axisY = node;
                                    }}
                                    type="checkbox"
                                    checked
                                    disabled
                                />
                                <Space width="8" />
                                {i18n._('Y-axis')}
                            </label>
                        </div>
                        <div className="col-xs-3">
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
                        <div className="col-xs-3">
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
                    </div>
                </div>
                <div className="form-group">
                    <Form
                        ref={node => {
                            this.form = node;
                        }}
                        onSubmit={(event) => {
                            event.preventDefault();
                        }}
                    >
                        <label><strong>{i18n._('Custom Commands')}</strong></label>
                        <div style={{ marginBottom: 10 }}>
                            <label>{i18n._('Go To Work Zero')}</label>
                            <Textarea
                                name="wzero"
                                value={wzero}
                                rows="2"
                                className="form-control"
                                placeholder="G0 X0 Y0 Z0"
                                validations={[validations.required]}
                            />
                        </div>
                        <div>
                            <label>{i18n._('Go To Machine Zero')}</label>
                            <Textarea
                                name="mzero"
                                value={mzero}
                                rows="2"
                                className="form-control"
                                placeholder="G53 G0 X0 Y0 Z0"
                                validations={[validations.required]}
                            />
                        </div>
                    </Form>
                </div>
            </div>
        );
    }
}

export default General;
