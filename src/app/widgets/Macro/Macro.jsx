import ensureArray from 'ensure-array';
import { useMachine } from '@xstate/react';
import _get from 'lodash/get';
import _includes from 'lodash/includes';
import React from 'react';
import { connect } from 'react-redux';
import Box from 'app/components/Box';
import { Button } from 'app/components/Buttons';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import { Container, Row, Col } from 'app/components/GridSystem';
import useModal from 'app/components/Modal/useModal';
import RenderChildren from 'app/components/RenderChildren';
import Space from 'app/components/Space';
import Text from 'app/components/Text';
import useMount from 'app/hooks/useMount';
import i18n from 'app/lib/i18n';
import {
    CONNECTION_STATE_CONNECTED,
} from 'app/constants/connection';
import {
    MACHINE_STATE_NONE,
    REFORMED_MACHINE_STATE_IDLE,
    REFORMED_MACHINE_STATE_RUN,
} from 'app/constants/controller';
import {
    WORKFLOW_STATE_IDLE,
    WORKFLOW_STATE_PAUSED,
    WORKFLOW_STATE_RUNNING,
} from 'app/constants/workflow';
import fetchMacrosMachine from './machines/fetchMacrosMachine';
import EditMacro from './modals/EditMacro';
import NewMacro from './modals/NewMacro';
import RunMacro from './modals/RunMacro';

/*
    handleRunMacro = (macro) => (event) => {
        const { actions } = this.props;
        actions.openRunMacroModal(macro.id);
    };

    handleLoadMacro = (macro) => (event) => {
        const { id, name } = macro;
        portal(({ onClose }) => (
            <Modal size="xs" onClose={onClose}>
                <Modal.Header>
                    <Modal.Title>
                        {i18n._('Load Macro')}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {i18n._('Are you sure you want to load this macro?')}
                    <p><strong>{name}</strong></p>
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        onClick={onClose}
                    >
                        {i18n._('No')}
                    </Button>
                    <Button
                        btnStyle="primary"
                        onClick={chainedFunction(
                            () => {
                                const { actions } = this.props;
                                actions.loadMacro(id, { name });
                            },
                            onClose
                        )}
                    >
                        {i18n._('Yes')}
                    </Button>
                </Modal.Footer>
            </Modal>
        ));
    };

    handleEditMacro = (macro) => (event) => {
        const { actions } = this.props;
        actions.openEditMacroModal(macro.id);
    };
*/

const Macro = ({
    canLoadMacro,
    canRunMacro,
}) => {
    const [current, send] = useMachine(fetchMacrosMachine);
    const { openModal } = useModal();

    useMount(() => {
        send('FETCH');
    });

    const handleNewMacro = () => {
        openModal(NewMacro);
    };
    const handleRefreshMacros = () => {
        send('FETCH');
    };
    const handleExportMacros = () => {
        // FIXME
    };
    const handleRunMacro = (macro) => () => {
        const { id, name, content } = macro;
        openModal(RunMacro, { id, name, content });
    };
    const handleLoadMacro = (macro) => () => {
        // FIXME
    };
    const handleEditMacro = (macro) => () => {
        const { id, name, content } = macro;
        openModal(EditMacro, { id, name, content });
    };

    return (
        <Container fluid>
            <Row>
                <Col>
                    <Button
                        sm
                        onClick={handleNewMacro}
                    >
                        <FontAwesomeIcon icon="plus" fixedWidth />
                        <Space width={8} />
                        {i18n._('New')}
                    </Button>
                </Col>
                <Col width="auto">
                    <Button
                        sm
                        onClick={handleExportMacros}
                    >
                        <FontAwesomeIcon icon="file-export" fixedWidth />
                        <Space width={8} />
                        {i18n._('Export')}
                    </Button>
                    <Button
                        sm
                        onClick={handleRefreshMacros}
                        title={i18n._('Refresh')}
                    >
                        <FontAwesomeIcon icon="sync-alt" fixedWidth />
                    </Button>
                </Col>
            </Row>
            <RenderChildren>
                {() => {
                    const macros = ensureArray(_get(current.context, 'data.records'));
                    const isErrorOccurred = !!_get(current.context, 'error');
                    const noMacrosAvailable = macros.length === 0;

                    if (isErrorOccurred) {
                        return (
                            <Text color="text.danger">
                                {i18n._('An error occurred while fetching data.')}
                            </Text>
                        );
                    }

                    if (noMacrosAvailable) {
                        return (
                            <Text>
                                {i18n._('No macros available')}
                            </Text>
                        );
                    }

                    return (
                        <Box>
                            {macros.map((macro, index) => (
                                <Row key={macro.id}>
                                    <Col>
                                        <Button
                                            sm
                                            disabled={!canRunMacro}
                                            onClick={handleRunMacro(macro)}
                                            title={i18n._('Run Macro')}
                                        >
                                            <i className="fa fa-play" />
                                        </Button>
                                        <Space width={8} />
                                        {macro.name}
                                    </Col>
                                    <Col width="auto">
                                        <Button
                                            sm
                                            disabled={!canLoadMacro}
                                            onClick={handleLoadMacro(macro)}
                                            title={i18n._('Load Macro')}
                                        >
                                            <i className="fa fa-chevron-up" />
                                        </Button>
                                        <Button
                                            sm
                                            onClick={handleEditMacro(macro)}
                                        >
                                            <i className="fa fa-edit" />
                                        </Button>
                                    </Col>
                                </Row>
                            ))}
                        </Box>
                    );
                }}
            </RenderChildren>
        </Container>
    );
};

export default connect(store => {
    const isActionable = (() => {
        const connectionState = _get(store, 'connection.state');
        const isConnected = (connectionState === CONNECTION_STATE_CONNECTED);
        if (!isConnected) {
            return false;
        }

        const workflowState = _get(store, 'workflow.state');
        const isWorkflowRunning = (workflowState === WORKFLOW_STATE_RUNNING);
        if (isWorkflowRunning) {
            return false;
        }

        const reformedMachineState = _get(store, 'controller.reformedMachineState');
        const expectedStates = [
            MACHINE_STATE_NONE, // No machine state reported (e.g. Marlin).
            REFORMED_MACHINE_STATE_IDLE,
            REFORMED_MACHINE_STATE_RUN,
        ];
        const isExpectedState = _includes(expectedStates, reformedMachineState);
        return isExpectedState;
    })();
    const workflowState = _get(store, 'workflow.state');
    const canLoadMacro = isActionable && _includes([
        WORKFLOW_STATE_IDLE,
    ], workflowState);
    const canRunMacro = isActionable && _includes([
        WORKFLOW_STATE_IDLE,
        WORKFLOW_STATE_PAUSED,
    ], workflowState) || true;

    return {
        canLoadMacro,
        canRunMacro,
    };
})(Macro);
