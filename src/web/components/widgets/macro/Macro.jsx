import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import i18n from '../../../lib/i18n';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class Macro extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    render() {
        return (
            <div>
                <div styleName="toolbar">
                    <div className="row no-gutters">
                        <div className="col-xs-5">
                        </div>
                        <div className="col-xs-7 text-right">
                            <button type="button" className="btn btn-xs btn-default">
                                <i className="fa fa-plus" />
                                &nbsp;
                                {i18n._('Add New Macro')}
                            </button>
                        </div>
                    </div>
                </div>
                <div styleName="table-container">
                    <table
                        styleName="table table-bordered"
                        style={{
                            borderTop: 0,
                            borderLeft: 0,
                            borderRight: 0
                        }}
                    >
                        <thead>
                            <tr>
                                <th>{i18n._('Macro Name')}</th>
                                <th style={{ width: '1%' }}>
                                    {i18n._('Action')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>xxx</td>
                                <td>xxx</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
}

export default Macro;
