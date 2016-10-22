import _ from 'lodash';
import classNames from 'classnames';
import React, { Component, PropTypes } from 'react';
import CSSModules from 'react-css-modules';
import Anchor from '../../components/Anchor';
import i18n from '../../lib/i18n';
import styles from './index.styl';

@CSSModules(styles, { allowMultiple: true })
class Sidebar extends Component {
    static propTypes = {
        path: PropTypes.string
    };

    shouldComponentUpdate(nextProps, nextState) {
        return !_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state);
    }
    render() {
        const { path, ...props } = this.props;

        return (
            <nav {...props} styleName="navbar">
                <ul styleName="nav">
                    <li
                        className="text-center"
                        styleName={classNames({
                            'active': path === 'workspace'
                        })}
                    >
                        <Anchor
                            title={i18n._('Workspace')}
                            href="#/workspace"
                        >
                            <i className="fa fa-desktop fa-2x" />
                            <span
                                style={{
                                    position: 'absolute',
                                    left: '50%',
                                    top: '41%',
                                    transform: 'translate(-50%, -50%)',
                                    fontSize: '70%'
                                }}
                            >XYZ</span>
                        </Anchor>
                    </li>
                    <li
                        className="text-center"
                        styleName={classNames({
                            'active': path === 'settings'
                        })}
                    >
                        <Anchor
                            title={i18n._('Settings')}
                            href="#/settings"
                        >
                            <i className="fa fa-cogs fa-2x" />
                        </Anchor>
                    </li>
                </ul>
            </nav>
        );
    }
}

export default Sidebar;
