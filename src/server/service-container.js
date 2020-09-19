import * as awilix from 'awilix';
import DirectoryWatcherService from 'server/services/DirectoryWatcherService';
import ShellCommandService from 'server/services/ShellCommandService';
import UserStoreService from 'server/services/UserStoreService';

const container = awilix.createContainer();

container.register({
  directoryWatcher: awilix.asClass(DirectoryWatcherService).singleton(),
  shellCommand: awilix.asClass(ShellCommandService).singleton(),
  userStore: awilix.asClass(UserStoreService).singleton(),
});

export default container;
