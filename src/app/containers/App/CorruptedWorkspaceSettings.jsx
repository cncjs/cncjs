import React from 'react';
import i18n from 'app/lib/i18n';
import Anchor from 'app/components/Anchor';
import { Button } from 'app/components/Buttons';
import Modal from 'app/components/Modal';
import ModalTemplate from 'app/components/ModalTemplate';
import Space from 'app/components/Space';
import settings from 'app/config/settings';
import config from 'app/store/config';

const CorruptedWorkspaceSettings = (props) => {
    const text = config.getConfig();
    const url = 'data:text/plain;charset=utf-8,' + encodeURIComponent(text);
    const filename = `${settings.name}-${settings.version}.json`;

    return (
        <Modal
            {...props}
            disableOverlay={true}
            showCloseButton={false}
        >
            <Modal.Body>
                <ModalTemplate type="error">
                    <h5>{i18n._('Corrupted workspace settings')}</h5>
                    <p>{i18n._('The workspace settings have become corrupted or invalid. Click Restore Defaults to restore default settings and continue.')}</p>
                    <div>
                        <Anchor
                            href={url}
                            download={filename}
                        >
                            <i className="fa fa-download" />
                            <Space width="4" />
                            {i18n._('Download workspace settings')}
                        </Anchor>
                    </div>
                </ModalTemplate>
            </Modal.Body>
            <Modal.Footer>
                <Button
                    btnStyle="danger"
                    onClick={() => {
                        // Reset default settings
                        config.restoreDefault();

                        // Persist data locally
                        config.persist();

                        // Reload the current page from the server
                        window.location.reload(true);
                    }}
                >
                    {i18n._('Restore Defaults')}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default CorruptedWorkspaceSettings;
