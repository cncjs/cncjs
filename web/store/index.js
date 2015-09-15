import { createStore } from 'redux';
import reducer from '../reducers';

let store = createStore(reducer);

export default store;
