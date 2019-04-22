import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { Button } from 'app/components/Buttons';
import Modal from 'app/components/Modal';
import Space from 'app/components/Space';
import i18n from 'app/lib/i18n';
import store from 'app/store';

class ImportSettings extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    render() {
        const { state, actions } = this.props;
        const { modal } = state;
        const { data } = modal.params;

        return (
            <Modal disableOverlay size="md" onClose={actions.closeModal}>
                <Modal.Header>
                    <Modal.Title>
                        {i18n._('Workspace')}
                        <Space width="8" />
                        &rsaquo;
                        <Space width="8" />
                        {i18n._('Import')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>{i18n._('Are you sure you want to overwrite the workspace settings?')}</p>
                    <pre style={{ minHeight: 200, maxHeight: 320, overflowY: 'auto' }}>
                        <code>{JSON.stringify(data, null, 2)}</code>
                    </pre>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        onClick={actions.closeModal}
                    >
                        {i18n._('Cancel')}
                    </Button>
                    <Button
                        btnStyle="danger"
                        onClick={() => {
                            // Persist data locally
                            store.persist(data);

                            // Refresh
                            window.location.reload();
                        }}
                    >
                        <i className="fa fa-upload" />
                        {i18n._('Import')}
                    </Button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export default ImportSettings;
