import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import CSSModules from 'react-css-modules';
import PressAndHold from '../../components/PressAndHold';
import i18n from '../../lib/i18n';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class Joystick extends Component {
    static propTypes = {
        show: PropTypes.bool,
        up: PropTypes.func,
        down: PropTypes.func,
        left: PropTypes.func,
        right: PropTypes.func,
        center: PropTypes.func
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { show, up, down, left, right, center } = this.props;

        return (
            <div styleName="joystick" className={classNames({ 'hidden': !show })}>
                <div className="row no-gutters">
                    <div className="col-xs-4" />
                    <div className="col-xs-4">
                        <PressAndHold
                            styleName="joystick-button"
                            onClick={up}
                            title={i18n._('Move Up')}
                        >
                            <i className="fa fa-chevron-up" />
                        </PressAndHold>
                    </div>
                    <div className="col-xs-4" />
                </div>
                <div className="row no-gutters">
                    <div className="col-xs-4 texe-center">
                        <PressAndHold
                            styleName="joystick-button"
                            onClick={left}
                            title={i18n._('Move Left')}
                        >
                            <i className="fa fa-chevron-left" />
                        </PressAndHold>
                    </div>
                    <div className="col-xs-4">
                        <PressAndHold
                            styleName="joystick-button"
                            onClick={center}
                            title={i18n._('Reset Position')}
                        >
                            <i className="fa fa-square-o" />
                        </PressAndHold>
                    </div>
                    <div className="col-xs-4">
                        <PressAndHold
                            styleName="joystick-button"
                            onClick={right}
                            title={i18n._('Move Right')}
                        >
                            <i className="fa fa-chevron-right" />
                        </PressAndHold>
                    </div>
                </div>
                <div className="row no-gutters">
                    <div className="col-xs-4" />
                    <div className="col-xs-4">
                        <PressAndHold
                            styleName="joystick-button"
                            onClick={down}
                            title={i18n._('Move Down')}
                        >
                            <i className="fa fa-chevron-down" style={{ verticalAlign: 'top' }} />
                        </PressAndHold>
                    </div>
                    <div className="col-xs-4" />
                </div>
            </div>
        );
    }
}

export default Joystick;
