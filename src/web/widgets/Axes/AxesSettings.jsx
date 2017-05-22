import _ from 'lodash';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import i18n from '../../lib/i18n';
import {
    DEFAULT_AXES
} from './constants';

class AxesSettings extends Component {
    static propTypes = {
        axes: PropTypes.array
    };
    static defaultProps = {
        axes: DEFAULT_AXES
    };

    state = this.getInitialState();

    getInitialState() {
        const { axes } = this.props;

        return { axes };
    }
    componentWillReceiveProps(nextProps) {
        const { axes } = nextProps;

        this.setState({ axes });
    }
    render() {
        const axes = _(this.state.axes)
            .union(DEFAULT_AXES)
            .uniq()
            .value();

        return (
            <div className="form-group">
                <label>{i18n._('Axes')}</label>
                <div className="row no-gutters">
                    <div className="col-xs-3">
                        <label>
                            <input
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
                                type="checkbox"
                                checked
                                disabled
                            />
                            <span className="space" />
                            {i18n._('Z-axis')}
                        </label>
                    </div>
                    <div className="col-xs-3">
                        <label>
                            <input
                                type="checkbox"
                                checked={_.includes(axes, 'a')}
                                onChange={(event) => {
                                    if (_.includes(axes, 'a')) {
                                        this.setState({ axes: ['x', 'y', 'z'] });
                                    } else {
                                        this.setState({ axes: ['x', 'y', 'z', 'a'] });
                                    }
                                }}
                            />
                            <span className="space" />
                            {i18n._('A-axis')}
                        </label>
                    </div>
                </div>
            </div>
        );
    }
}

export default AxesSettings;
