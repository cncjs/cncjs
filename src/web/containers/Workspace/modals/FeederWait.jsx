import chainedFunction from 'chained-function';
import PropTypes from 'prop-types';
import React from 'react';
import { Button } from 'web/components/Buttons';
import ModalTemplate from 'web/components/ModalTemplate';
import Modal from 'web/components/Modal';
import controller from 'web/lib/controller';
import i18n from 'web/lib/i18n';

const FeederWait = (props) => (
    <Modal
        size="xs"
        disableOverlay={true}
        showCloseButton={false}
    >
        <Modal.Body>
            <ModalTemplate type="warning">
                <h5>{props.title}</h5>
                <p>{i18n._('Waiting for the planner to empty...')}</p>
            </ModalTemplate>
        </Modal.Body>
        <Modal.Footer>
            <Button
                btnStyle="danger"
                onClick={chainedFunction(
                    () => {
                        controller.command('feeder:stop');
                    },
                    props.onClose
                )}
            >
                {i18n._('Stop')}
            </Button>
        </Modal.Footer>
    </Modal>
);

FeederWait.propTypes = {
    title: PropTypes.string,
    onClose: PropTypes.func
};

export default FeederWait;
