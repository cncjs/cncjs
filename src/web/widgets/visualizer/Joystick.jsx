import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import PressAndHold from '../../components/PressAndHold';
import i18n from '../../lib/i18n';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class Joystick extends Component {
    static propTypes = {
        state: PropTypes.object,
        up: PropTypes.func,
        down: PropTypes.func,
        left: PropTypes.func,
        right: PropTypes.func,
        center: PropTypes.func
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props);
    }
    render() {
        const { state, up, down, left, right, center } = this.props;
        const { canClick } = state;
        const disabled = !canClick;

        return (
            <div styleName="joystick">
                <div className="row no-gutters">
                    <div className="col-xs-4"></div>
                    <div className="col-xs-4">
                        <PressAndHold
                            styleName="joystick-button"
                            onClick={up}
                            title={i18n._('Move Up')}
                            disabled={disabled}
                        >
                            <i className="fa fa-chevron-up"></i>
                        </PressAndHold>
                    </div>
                    <div className="col-xs-4"></div>
                </div>
                <div className="row no-gutters">
                    <div className="col-xs-4 texe-center">
                        <PressAndHold
                            styleName="joystick-button"
                            onClick={left}
                            title={i18n._('Move Left')}
                            disabled={disabled}
                        >
                            <i className="fa fa-chevron-left"></i>
                        </PressAndHold>
                    </div>
                    <div className="col-xs-4">
                        <PressAndHold
                            styleName="joystick-button"
                            onClick={center}
                            title={i18n._('Reset Position')}
                            disabled={disabled}
                        >
                            <i className="fa fa-square-o"></i>
                        </PressAndHold>
                    </div>
                    <div className="col-xs-4">
                        <PressAndHold
                            styleName="joystick-button"
                            onClick={right}
                            title={i18n._('Move Right')}
                            disabled={disabled}
                        >
                            <i className="fa fa-chevron-right"></i>
                        </PressAndHold>
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className="col-xs-4"></div>
                    <div className="col-xs-4">
                        <PressAndHold
                            styleName="joystick-button"
                            onClick={down}
                            title={i18n._('Move Down')}
                            disabled={disabled}
                        >
                            <i className="fa fa-chevron-down" style={{ verticalAlign: 'top' }}></i>
                        </PressAndHold>
                    </div>
                    <div className="col-xs-4"></div>
                </div>
            </div>
        );
    }
}

export default Joystick;
