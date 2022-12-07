import { createMachine, assign } from 'xstate';

const createFetchMachine = () => {
  const fetchMachine = createMachine({
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
        on: {
          CANCEL: 'idle',
        }
      },
      success: {
        entry: 'onSuccess',
        on: {
          FETCH: 'loading',
          CLEAR: 'idle',
        },
      },
      failure: {
        entry: 'onFailure',
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
      onSuccess: (context, event) => {},
      onFailure: (context, event) => {},
    },
    services: {
      fetch: (context, event) => null,
    },
  });

  return fetchMachine;
};

export {
  createFetchMachine,
};
