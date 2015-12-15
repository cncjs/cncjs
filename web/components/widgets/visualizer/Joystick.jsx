import i18n from 'i18next';
import React from 'react';
import PressAndHold from '../../common/PressAndHold';

class Joystick extends React.Component {
    static propTypes = {
        up: React.PropTypes.func,
        down: React.PropTypes.func,
        left: React.PropTypes.func,
        right: React.PropTypes.func,
        center: React.PropTypes.func
    };

    render() {
        let { up, down, left, right, center } = this.props;

        return (
            <div className="joystick">
                <table>
                    <tbody>
                        <tr>
                            <td></td>
                            <td className="noselect">
                                <PressAndHold
                                    className="joystick-button"
                                    onClick={up}
                                    title={i18n._('Move Up')}
                                >
                                    <i className="glyphicon glyphicon-chevron-up"></i>
                                </PressAndHold>
                            </td>
                            <td></td>
                        </tr>
                        <tr>
                            <td className="noselect">
                                <PressAndHold
                                    className="joystick-button"
                                    onClick={left}
                                    title={i18n._('Move Left')}
                                >
                                    <i className="glyphicon glyphicon-chevron-left"></i>
                                </PressAndHold>
                            </td>
                            <td className="noselect">
                                <PressAndHold
                                    className="joystick-button"
                                    onClick={center}
                                    title={i18n._('Reset Position')}
                                >
                                    <i className="glyphicon glyphicon-unchecked"></i>
                                </PressAndHold>
                            </td>
                            <td className="noselect">
                                <PressAndHold
                                    className="joystick-button"
                                    onClick={right}
                                    title={i18n._('Move Right')}
                                >
                                    <i className="glyphicon glyphicon-chevron-right"></i>
                                </PressAndHold>
                            </td>
                        </tr>
                        <tr>
                            <td></td>
                            <td className="noselect">
                                <PressAndHold
                                    className="joystick-button"
                                    onClick={down}
                                    title={i18n._('Move Down')}
                                >
                                    <i className="glyphicon glyphicon-chevron-down"></i>
                                </PressAndHold>
                            </td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }
}

export default Joystick;
