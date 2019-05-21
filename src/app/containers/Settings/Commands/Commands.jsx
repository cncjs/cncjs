import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import CreateRecord from './CreateRecord';
import UpdateRecord from './UpdateRecord';
import TableRecords from './TableRecords';
import {
    MODAL_CREATE_RECORD,
    MODAL_UPDATE_RECORD
} from './constants';

class Commands extends PureComponent {
    static propTypes = {
        initialState: PropTypes.object,
        state: PropTypes.object,
        stateChanged: PropTypes.bool,
        actions: PropTypes.object
    };

    componentDidMount() {
        const { actions } = this.props;
        actions.fetchRecords();
    }

    render() {
        const { state, actions } = this.props;

        return (
            <div style={{ margin: -15 }}>
                {state.modal.name === MODAL_CREATE_RECORD &&
                <CreateRecord state={state} actions={actions} />
                }
                {state.modal.name === MODAL_UPDATE_RECORD &&
                <UpdateRecord state={state} actions={actions} />
                }
                <TableRecords state={state} actions={actions} />
            </div>
        );
    }
}

export default Commands;
