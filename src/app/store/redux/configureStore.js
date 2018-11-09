import env from 'app/config/env';

export default (env.NODE_ENV === 'production')
    ? require('./configureStore.production').default
    : require('./configureStore.development').default;
