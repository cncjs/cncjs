import _ from 'lodash';
import uuid from 'uuid';
import log from '../lib/log';
import taskRunner from '../services/taskrunner';
import configStore from '../services/configstore';
import {
    ERR_NOT_FOUND
} from '../constants';

const PREFIX = '[api.commands]';

const state = {
    commands: []
};

const mapConfigToState = (config) => {
    state.commands = _.map(config.commands, (c) => {
        return { ...c, id: uuid.v4() };
    });
};

configStore.on('load', mapConfigToState);
configStore.on('change', mapConfigToState);

export const getCommands = (req, res) => {
    res.send({
        commands: state.commands.map(({ id, command, text }) => {
            return {
                id: id,
                disabled: !command,
                text: text
            };
        })
    });
};

export const runCommand = (req, res) => {
    const { id = '' } = { ...req.body };
    const c = _.find(state.commands, { id: id });

    if (!c || !c.command) {
        res.status(ERR_NOT_FOUND).send({
            msg: 'Command not found'
        });
        return;
    }

    log.info(`${PREFIX} Execute the "${c.text}" command from "${c.command}"`);

    const taskId = taskRunner.run(c.command);

    res.send({ taskId: taskId });
};
