import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import AddAccount from './AddAccount';
import EditAccount from './EditAccount';
import AccountList from './AccountList';
import {
    MODAL_ADD_ACCOUNT,
    MODAL_EDIT_ACCOUNT
} from './constants';

class Account extends Component {
    static propTypes = {
        initialState: PropTypes.object,
        state: PropTypes.object,
        stateChanged: PropTypes.bool,
        actions: PropTypes.object
    };

    componentDidMount() {
        const { actions } = this.props;
        actions.fetchData();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { state, actions } = this.props;

        return (
            <div style={{ margin: -15 }}>
                {state.modal.name === MODAL_ADD_ACCOUNT &&
                <AddAccount state={state} actions={actions} />
                }
                {state.modal.name === MODAL_EDIT_ACCOUNT &&
                <EditAccount state={state} actions={actions} />
                }
                <AccountList state={state} actions={actions} />
            </div>
        );
    }
}

export default Account;
