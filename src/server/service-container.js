import * as awilix from 'awilix';
import ConfigService from './services/ConfigService';
import TaskService from './services/TaskService';
import WatcherService from './services/WatcherService';

const container = awilix.createContainer();

container.register({
    config: awilix.asClass(ConfigService).singleton(),
    task: awilix.asClass(TaskService).singleton(),
    watcher: awilix.asClass(WatcherService).singleton(),
});

export default container;
