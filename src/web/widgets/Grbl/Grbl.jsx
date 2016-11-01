import _ from 'lodash';
import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import CSSModules from 'react-css-modules';
import mapGCodeToText from '../../lib/gcode-text';
import i18n from '../../lib/i18n';
import Panel from '../../components/Panel';
import Toggler from '../../components/Toggler';
import Toolbar from './Toolbar';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class Grbl extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { state, actions } = this.props;
        const none = '–';
        const panel = state.panel;
        const controllerState = state.controller.state || {};
        const parserState = _.get(controllerState, 'parserstate', {});
        const activeState = _.get(controllerState, 'status.activeState') || none;
        const feedrate = _.get(controllerState, 'status.feedrate', parserState.feedrate);
        const spindleSpeed = _.get(controllerState, 'status.spindle', parserState.spindle);
        const toolNumber = parserState.tool;
        const modal = _.mapValues(parserState.modal || {}, (word, group) => mapGCodeToText(word));

        return (
            <div>
                <Toolbar {...this.props} styleName="toolbar" />
                <Panel styleName="panel">
                    <Panel.Heading styleName="panel-heading">
                        <Toggler
                            className="clearfix"
                            onToggle={() => {
                                actions.toggleStatusReports();
                            }}
                        >
                            <div className="pull-left">{i18n._('Status Reports')}</div>
                            <Toggler.Icon
                                className="pull-right"
                                expanded={panel.statusReports.expanded}
                            />
                        </Toggler>
                    </Panel.Heading>
                    {panel.statusReports.expanded &&
                    <Panel.Body>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('State')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well">
                                    {activeState}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Feed Rate')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well">
                                    {feedrate}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Spindle')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well">
                                    {spindleSpeed}
                                </div>
                            </div>
                        </div>
                        <div className="row no-gutters">
                            <div className="col col-xs-4">
                                {i18n._('Tool Number')}
                            </div>
                            <div className="col col-xs-8">
                                <div styleName="well">
                                    {toolNumber}
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
