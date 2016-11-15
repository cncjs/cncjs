import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import styles from './index.styl';

class DigitalReadout extends Component {
    static propTypes = {
        label: PropTypes.string,
        value: PropTypes.string
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { label, value, children } = this.props;

        return (
            <div className={classNames('row', 'no-gutters', styles.dro)}>
                <div className="col col-xs-1">
                    <div className={styles.droLabel}>{label}</div>
                </div>
                <div className="col col-xs-2">
                    <div
                        className={classNames(
                            styles.well,
                            styles.droText
                        )}
                    >
                        {value}
                    </div>
                </div>
                <div className="col col-xs-9">
                    <div className={styles.droBtnGroup}>
                        <div className="input-group input-group-xs">
                            <div className="input-group-btn">
                                {children}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default DigitalReadout;
