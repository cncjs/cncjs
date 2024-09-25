import env from '@app/config/env';
import configureStoreProduction from './configureStore.production';
import configureStoreDevelopment from './configureStore.development';

const configureStore = (env.NODE_ENV === 'production') ? configureStoreProduction : configureStoreDevelopment;

export default configureStore;
