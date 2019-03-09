import React, { Component } from 'react';
import { ButtonToolbar, ButtonGroup, Button } from 'app/components/Buttons';
import FontAwesomeIcon from 'app/components/FontAwesomeIcon';
import Space from 'app/components/Space';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';

class QuickAccessToolbar extends Component {
    command = {
        'cyclestart': () => {
            controller.command('cyclestart');
        },
        'feedhold': () => {
            controller.command('feedhold');
        },
        'homing': () => {
            controller.command('homing');
        },
        'sleep': () => {
            controller.command('sleep');
        },
        'unlock': () => {
            controller.command('unlock');
        },
        'reset': () => {
            controller.command('reset');
        }
    };

    render() {
        return (
            <ButtonToolbar>
                <ButtonGroup>
                    <Button
                        btnStyle="default"
                        onClick={this.command.cyclestart}
                        title={i18n._('Cycle Start')}
                    >
                        <FontAwesomeIcon icon="redo-alt" />
                        <Space width="8" />
                        {i18n._('Cycle Start')}
                    </Button>
                    <Button
                        btnStyle="default"
                        onClick={this.command.feedhold}
                        title={i18n._('Feedhold')}
                    >
                        <FontAwesomeIcon icon="hand-paper" />
                        <Space width="8" />
                        {i18n._('Feedhold')}
                    </Button>
                </ButtonGroup>
                <Space width={12} />
                <ButtonGroup>
                    <Button
                        btnStyle="primary"
                        onClick={this.command.homing}
                        title={i18n._('Homing')}
                    >
                        <FontAwesomeIcon icon="home" />
                        <Space width="8" />
                        {i18n._('Homing')}
                    </Button>
                    <Button
                        btnStyle="success"
                        onClick={this.command.sleep}
                        title={i18n._('Sleep')}
                    >
                        <FontAwesomeIcon icon="bed" />
                        <Space width="8" />
                        {i18n._('Sleep')}
                    </Button>
                    <Button
                        btnStyle="warning"
                        onClick={this.command.unlock}
                        title={i18n._('Unlock')}
                    >
                        <FontAwesomeIcon icon="unlock-alt" />
                        <Space width="8" />
                        {i18n._('Unlock')}
                    </Button>
                    <Button
                        btnStyle="danger"
                        onClick={this.command.reset}
                        title={i18n._('Reset')}
                    >
                        <FontAwesomeIcon icon="undo" />
                        <Space width="8" />
                        {i18n._('Reset')}
                    </Button>
                </ButtonGroup>
            </ButtonToolbar>
        );
    }
}

export default QuickAccessToolbar;
