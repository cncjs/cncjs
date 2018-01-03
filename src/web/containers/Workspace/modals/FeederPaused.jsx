import chainedFunction from 'chained-function';
import PropTypes from 'prop-types';
import React from 'react';
import { Button } from '../../../components/Buttons';
import MessageTemplate from '../../../components/MessageTemplate';
import Modal from '../../../components/Modal';
import controller from '../../../lib/controller';
import i18n from '../../../lib/i18n';

const FeederPaused = (props) => (
    <Modal
        size="xs"
        closeOnOverlayClick={false}
        showCloseButton={false}
    >
        <Modal.Body>
            <MessageTemplate type="warning">
                <h5>{props.title}</h5>
                <p>{i18n._('Click the Continue button to resume execution.')}</p>
            </MessageTemplate>
        </Modal.Body>
        <Modal.Footer>
            <Button
                className="pull-left"
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
            <Button
                onClick={chainedFunction(
                    () => {
                        controller.command('feeder:start');
                    },
                    props.onClose
                )}
            >
                {i18n._('Continue')}
            </Button>
        </Modal.Footer>
    </Modal>
);

FeederPaused.propTypes = {
    title: PropTypes.string,
    onClose: PropTypes.func
};

export default FeederPaused;
