import { Machine, assign } from 'xstate';

const createFetchMachine = () => {
  const fetchMachine = Machine({
    id: 'fetchMachine',
    initial: 'idle',
    context: {
      data: null,
      error: null,
    },
    states: {
      idle: {
        entry: 'clear',
        on: {
          FETCH: 'loading',
          CLEAR: 'idle',
        },
      },
      loading: {
        invoke: {
          src: 'fetch',
          onDone: {
            target: 'success',
            actions: assign({
              data: (context, event) => event.data,
            }),
          },
          onError: {
            target: 'failure',
            actions: assign({
              error: (context, event) => event.data,
            }),
          },
        },
      },
      success: {
        entry: 'notifySuccess',
        on: {
          FETCH: 'loading',
          CLEAR: 'idle',
        },
      },
      failure: {
        entry: 'notifyFailure',
        on: {
          FETCH: 'loading',
          CLEAR: 'idle',
        },
      },
    },
  }, {
    actions: {
      clear: assign({
        data: null,
        error: null,
      }),
      notifySuccess: (context) => {},
      notifyFailure: (context) => {},
    },
    services: {
      fetch: (context) => null,
    },
  });

  return fetchMachine;
};

export default createFetchMachine;
