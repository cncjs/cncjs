import i18n from '../../../lib/i18n';
import React from 'react';
import PressAndHold from '../../common/PressAndHold';

const Joystick = (props) => {
    const { ready, up, down, left, right, center } = props;
    const canClick = ready;

    return (
        <div className="joystick">
            <div className="container-fluid">
                <div className="row no-gutter">
                    <div className="col-xs-4"></div>
                    <div className="col-xs-4">
                        <PressAndHold
                            className="joystick-button"
                            onClick={up}
                            title={i18n._('Move Up')}
                            disabled={!canClick}
                        >
                            <i className="fa fa-chevron-up"></i>
                        </PressAndHold>
                    </div>
                    <div className="col-xs-4"></div>
                </div>
                <div className="row no-gutter">
                    <div className="col-xs-4 texe-center">
                        <PressAndHold
                            className="joystick-button"
                            onClick={left}
                            title={i18n._('Move Left')}
                            disabled={!canClick}
                        >
                            <i className="fa fa-chevron-left"></i>
                        </PressAndHold>
                    </div>
                    <div className="col-xs-4">
                        <PressAndHold
                            className="joystick-button"
                            onClick={center}
                            title={i18n._('Reset Position')}
                            disabled={!canClick}
                        >
                            <i className="fa fa-square-o"></i>
                        </PressAndHold>
                    </div>
                    <div className="col-xs-4">
                        <PressAndHold
                            className="joystick-button"
                            onClick={right}
                            title={i18n._('Move Right')}
                            disabled={!canClick}
                        >
                            <i className="fa fa-chevron-right"></i>
                        </PressAndHold>
                    </div>
                </div>
                <div className="row no-gutter">
                    <div className="col-xs-4"></div>
                    <div className="col-xs-4">
                        <PressAndHold
                            className="joystick-button"
                            onClick={down}
                            title={i18n._('Move Down')}
                            disabled={!canClick}
                        >
                            <i className="fa fa-chevron-down" style={{ verticalAlign: 'top' }}></i>
                        </PressAndHold>
                    </div>
                    <div className="col-xs-4"></div>
                </div>
            </div>
        </div>
    );
};

Joystick.propTypes = {
    ready: React.PropTypes.bool,
    up: React.PropTypes.func,
    down: React.PropTypes.func,
    left: React.PropTypes.func,
    right: React.PropTypes.func,
    center: React.PropTypes.func
};

export default Joystick;
