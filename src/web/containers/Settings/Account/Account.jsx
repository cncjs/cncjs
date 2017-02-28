import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import AddModal from './AddModal';
import EditModal from './EditModal';
import TableView from './TableView';
import {
    MODAL_ADD,
    MODAL_EDIT
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
        actions.fetchItems();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    render() {
        const { state, actions } = this.props;

        return (
            <div style={{ margin: -15 }}>
                {state.modal.name === MODAL_ADD &&
                <AddModal state={state} actions={actions} />
                }
                {state.modal.name === MODAL_EDIT &&
                <EditModal state={state} actions={actions} />
                }
                <TableView state={state} actions={actions} />
            </div>
        );
    }
}

export default Account;
