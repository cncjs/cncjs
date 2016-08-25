import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import mapGCodeToText from '../../../lib/gcode-text';
import i18n from '../../../lib/i18n';
import Panel from '../../common/Panel';
import Toggler from '../../common/Toggler';
import Toolbar from './Toolbar';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class Grbl extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props);
    }
    render() {
        const { state, actions } = this.props;
        const none = '–';
        const panel = state.panel;
        const controllerState = state.controller.state;
        const activeState = _.get(controllerState, 'status.activeState');
        const parserstate = _.get(controllerState, 'parserstate', {});
        const modal = _.mapValues(parserstate.modal || {}, (word, group) => mapGCodeToText(word));

        return (
            <div>
                <Toolbar {...this.props} styleName="toolbar" />
                <Panel styleName="panel">
                    <Panel.Heading styleName="panel-heading">
                        <Toggler
                            className="clearfix"
                            onToggle={() => {
                                actions.toggleParserState();
                            }}
                        >
                            <div className="pull-left">{i18n._('Parser State')}</div>
                            <Toggler.Icon
                                className="pull-right"
                                expanded={panel.parserState.expanded}
                            />
                        </Toggler>
                    </Panel.Heading>
                {panel.parserState.expanded &&
                    <Panel.Body>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('State')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well">
                                    {activeState || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Feed Rate')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well">
                                    {Number(parserstate.feedrate) || 0}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Spindle')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well">
                                    {Number(parserstate.spindle) || 0}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Tool Number')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well">
                                    {parserstate.tool || none}
                                </div>
                            </div>
                        </div>
                    </Panel.Body>
                }
                </Panel>
                <Panel styleName="panel last">
                    <Panel.Heading styleName="panel-heading">
                        <Toggler
                            className="clearfix"
                            onToggle={() => {
                                actions.toggleModalGroups();
                            }}
                        >
                            <div className="pull-left">{i18n._('Modal Groups')}</div>
                            <Toggler.Icon
                                className="pull-right"
                                expanded={panel.modalGroups.expanded}
                            />
                        </Toggler>
                    </Panel.Heading>
                {panel.modalGroups.expanded &&
                    <Panel.Body>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Motion')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well" title={modal.motion}>
                                    {modal.motion || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Coordinate')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well" title={modal.coordinate}>
                                    {modal.coordinate || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Plane')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well" title={modal.plane}>
                                    {modal.plane || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Distance')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well" title={modal.distance}>
                                    {modal.distance || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Feed Rate')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well" title={modal.feedrate}>
                                    {modal.feedrate || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Units')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well" title={modal.units}>
                                    {modal.units || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Program')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well" title={modal.program}>
                                    {modal.program || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Spindle')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well" title={modal.spindle}>
                                    {modal.spindle || none}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Coolant')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well" title={modal.coolant}>
                                    {modal.coolant || none}
                                </div>
                            </div>
                        </div>
                    </Panel.Body>
                }
                </Panel>
            </div>
        );
    }
}

export default Grbl;
