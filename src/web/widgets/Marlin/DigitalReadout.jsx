import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import styles from './index.styl';

const DigitalReadout = (props) => {
    const { label, value, children } = props;

    return (
        <div className={classNames('row', 'no-gutters', styles.dro)}>
            <div className="col col-xs-1">
                <div className={styles.droLabel}>{label}</div>
            </div>
            <div className="col col-xs-2">
                <div
                    className={classNames(
                        styles.well,
                        styles.droDisplay
                    )}
                >
                    {value}
                </div>
            </div>
            <div className="col col-xs-9">
                <div className={styles.droBtnGroup}>
                    <div className="input-group input-group-sm">
                        <div className="input-group-btn">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

DigitalReadout.propTypes = {
    label: PropTypes.string,
    value: PropTypes.string
};

export default DigitalReadout;
