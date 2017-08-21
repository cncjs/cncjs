import get from 'lodash/get';
import includes from 'lodash/includes';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import i18n from '../../../lib/i18n';
import Validation from '../../../lib/react-validation';

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
        const axes = [];
        this.fields.axisX.checked && axes.push('x');
        this.fields.axisY.checked && axes.push('y');
        this.fields.axisZ.checked && axes.push('z');
        this.fields.axisA.checked && axes.push('a');

        return {
            axes: axes,
            wzero: get(this.fields.wzero, 'state.value'),
            mzero: get(this.fields.mzero, 'state.value')
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
                                <span className="space" />
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
                                <span className="space" />
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
                                <span className="space" />
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
                                <span className="space" />
                                {i18n._('A-axis')}
                            </label>
                        </div>
                    </div>
                </div>
                <div className="form-group">
                    <Validation.components.Form
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
                            <Validation.components.Textarea
                                ref={node => {
                                    this.fields.wzero = node;
                                }}
                                className="form-control"
                                rows="2"
                                name="wzero"
                                value={wzero}
                                placeholder="G0 X0 Y0 Z0"
                                validations={['required']}
                            />
                        </div>
                        <div>
                            <label>{i18n._('Go To Machine Zero')}</label>
                            <Validation.components.Textarea
                                ref={node => {
                                    this.fields.mzero = node;
                                }}
                                className="form-control"
                                rows="2"
                                name="mzero"
                                value={mzero}
                                placeholder="G53 G0 X0 Y0 Z0"
                                validations={['required']}
                            />
                        </div>
                    </Validation.components.Form>
                </div>
            </div>
        );
    }
}

export default General;
