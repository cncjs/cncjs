import _ from 'lodash';
import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import i18n from '../../../lib/i18n';
import Widget from '../../widget';
import Macro from './Macro';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class MacroWidget extends Component {
    static propTypes = {
        onDelete: PropTypes.func
    };
    static defaultProps = {
        onDelete: () => {}
    };

    state = {
        isCollapsed: false,
        isFullscreen: false
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state);
    }
    render() {
        const { isCollapsed, isFullscreen } = this.state;
        const state = {
            ...this.state
        };
        const actions = {
        };

        return (
            <Widget {...this.props} fullscreen={isFullscreen}>
                <Widget.Header>
                    <Widget.Title>{i18n._('Macro')}</Widget.Title>
                    <Widget.Controls>
                        <Widget.Button
                            type="toggle"
                            defaultValue={isCollapsed}
                            onClick={(event, val) => this.setState({ isCollapsed: !!val })}
                        />
                        <Widget.Button
                            type="fullscreen"
                            defaultValue={isFullscreen}
                            onClick={(event, val) => this.setState({ isFullscreen: !!val })}
                        />
                        <Widget.Button
                            type="delete"
                            onClick={(event) => this.props.onDelete()}
                        />
                    </Widget.Controls>
                </Widget.Header>
                <Widget.Content
                    styleName={classNames(
                        'widget-content',
                        { 'hidden': isCollapsed }
                    )}
                >
                    <Macro
                        state={state}
                        actions={actions}
                    />
                </Widget.Content>
            </Widget>
        );
    }
}

export default MacroWidget;
