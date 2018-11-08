import rootSaga from 'app/sagas';
import configureStore from './configureStore';

const store = configureStore();
store.runSaga(rootSaga);

export default store;
